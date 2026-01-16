using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Cinematica.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TmdbController : ControllerBase
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<TmdbController> _logger;
    private readonly string _apiKey;
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private const string TmdbImageBase = "https://image.tmdb.org/t/p/w342";

    public TmdbController(IHttpClientFactory httpFactory, IMemoryCache cache, IConfiguration config, ILogger<TmdbController> logger)
    {
        _httpFactory = httpFactory;
        _cache = cache;
        _logger = logger;

        // configuration (launchSettings env vars / user secrets / env)
        var key = config["Tmdb:ApiKey"];
        if (string.IsNullOrWhiteSpace(key))
        {
            key = Environment.GetEnvironmentVariable("Tmdb__ApiKey") ??
                  Environment.GetEnvironmentVariable("Tmdb:ApiKey");
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            _logger.LogError("TMDb API key not configured.");
            throw new InvalidOperationException("TMDb API key not configured. Set Tmdb:ApiKey or Tmdb__ApiKey.");
        }

        _apiKey = key;
    }

  
    // params:
    //   minVotes
    //   minRating
    //   minYear 
    //   maxYear 
    //   decades
    [HttpGet("deck")]
    public async Task<IActionResult> GetDeck(
        [FromQuery] int? minVotes,
        [FromQuery] decimal? minRating,
        [FromQuery] int? minYear,
        [FromQuery] int? maxYear,
        [FromQuery] bool decades = false)
    {
        var cacheKey = $"tmdb_deck_v2_{minVotes}_{minRating}_{minYear}_{maxYear}_{decades}";
        if (_cache.TryGetValue(cacheKey, out object? cached))
            return Ok(cached);

        var client = _httpFactory.CreateClient();

        var votes = minVotes ?? 300;
        var rating = minRating ?? 6.0m;

        var rand = new Random();

        List<MovieDto> pool = new();

        if (decades)
        {
            var startDecade = 1950;
            var currentYear = DateTime.UtcNow.Year;
            var endDecade = (currentYear / 10) * 10;
            var decadesList = new List<(int from, int to)>();
            for (int d = startDecade; d <= endDecade; d += 10)
                decadesList.Add((d, d + 9));

            foreach (var (fromYear, toYear) in decadesList)
            {
                try
                {
                    var found = await GetSampleForRange(client, votes, rating, fromYear, toYear, 3);
                    pool.AddRange(found);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Decade fetch failed for {From}-{To}", fromYear, toYear);
                    
                }
            }
        }
        else
        {
            var baseUrl = "https://api.themoviedb.org/3/discover/movie";
            var q = new Dictionary<string, string?>
            {
                ["api_key"] = _apiKey,
                ["language"] = "en-US",
                ["include_adult"] = "false",
                ["vote_count.gte"] = votes.ToString(CultureInfo.InvariantCulture),
                ["vote_average.gte"] = rating.ToString(CultureInfo.InvariantCulture),
                ["sort_by"] = "vote_count.desc",
                ["page"] = "1"
            };
            if (minYear.HasValue) q["primary_release_date.gte"] = $"{minYear.Value}-01-01";
            if (maxYear.HasValue) q["primary_release_date.lte"] = $"{maxYear.Value}-12-31";

            var discoverUrl = QueryHelpers.AddQueryString(baseUrl, q);
            var resp = await client.GetAsync(discoverUrl);
            if (!resp.IsSuccessStatusCode)
            {
                var content = await resp.Content.ReadAsStringAsync();
                _logger.LogWarning("TMDb discover failed: {Status} {Content}", (int)resp.StatusCode, content);
                return StatusCode((int)resp.StatusCode, new { error = "TMDb discover failed", status = (int)resp.StatusCode, body = content });
            }

            using var doc = JsonDocument.Parse(await resp.Content.ReadAsStreamAsync());
            var totalPages = doc.RootElement.GetProperty("total_pages").GetInt32();
            var maxPage = Math.Min(totalPages, 50);
            var page = rand.Next(1, Math.Max(2, maxPage + 1));

            // fetch the chosen page
            q["page"] = page.ToString();
            var pageUrl = QueryHelpers.AddQueryString(baseUrl, q);
            var pageResp = await client.GetAsync(pageUrl);
            if (!pageResp.IsSuccessStatusCode)
            {
                var content = await pageResp.Content.ReadAsStringAsync();
                _logger.LogWarning("TMDb page fetch failed: {Status} {Content}", (int)pageResp.StatusCode, content);
                return StatusCode((int)pageResp.StatusCode, new { error = "TMDb page failed", status = (int)pageResp.StatusCode, body = content });
            }

            using var pageDoc = JsonDocument.Parse(await pageResp.Content.ReadAsStreamAsync());
            var items = pageDoc.RootElement.GetProperty("results")
                .EnumerateArray()
                .Select(e => new
                {
                    Id = e.GetProperty("id").GetInt32(),
                    Title = e.GetProperty("title").GetString() ?? string.Empty,
                    Overview = e.TryGetProperty("overview", out var ov) && ov.ValueKind == JsonValueKind.String ? ov.GetString() ?? string.Empty : string.Empty,
                    PosterPath = e.TryGetProperty("poster_path", out var p) && p.ValueKind != JsonValueKind.Null ? p.GetString() : null,
                    ReleaseDate = e.TryGetProperty("release_date", out var rd) && rd.ValueKind == JsonValueKind.String ? rd.GetString() : null,
                    Rating = e.TryGetProperty("vote_average", out var va) && va.ValueKind != JsonValueKind.Null ? va.GetDecimal() : (decimal?)null
                })
                .ToList();

            pool.AddRange(await EnrichMovies(client, items));
        }

        var distinct = pool
            .GroupBy(m => m.Id)
            .Select(g => g.First())
            .OrderBy(_ => rand.Next())
            .Take(20)
            .ToArray();

        _cache.Set(cacheKey, distinct, TimeSpan.FromMinutes(5));
        return Ok(distinct);
    }

    private async Task<List<MovieDto>> GetSampleForRange(HttpClient client, int minVotes, decimal minRating, int fromYear, int toYear, int desired)
    {
        var baseUrl = "https://api.themoviedb.org/3/discover/movie";
        var q = new Dictionary<string, string?>
        {
            ["api_key"] = _apiKey,
            ["language"] = "en-US",
            ["include_adult"] = "false",
            ["vote_count.gte"] = minVotes.ToString(CultureInfo.InvariantCulture),
            ["vote_average.gte"] = minRating.ToString(CultureInfo.InvariantCulture),
            ["sort_by"] = "vote_count.desc",
            ["primary_release_date.gte"] = $"{fromYear}-01-01",
            ["primary_release_date.lte"] = $"{toYear}-12-31",
            ["page"] = "1"
        };

        var resp = await client.GetAsync(QueryHelpers.AddQueryString(baseUrl, q));
        if (!resp.IsSuccessStatusCode) throw new HttpRequestException($"discover range failed {resp.StatusCode}");

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStreamAsync());
        var totalPages = doc.RootElement.GetProperty("total_pages").GetInt32();
        var maxPage = Math.Min(totalPages, 5); 

        var rand = new Random();
        var page = rand.Next(1, Math.Max(2, maxPage + 1));
        q["page"] = page.ToString();

        var pageResp = await client.GetAsync(QueryHelpers.AddQueryString(baseUrl, q));
        if (!pageResp.IsSuccessStatusCode) throw new HttpRequestException($"discover range page failed {pageResp.StatusCode}");

        using var pageDoc = JsonDocument.Parse(await pageResp.Content.ReadAsStreamAsync());
        var items = pageDoc.RootElement.GetProperty("results")
            .EnumerateArray()
            .Select(e => new
            {
                Id = e.GetProperty("id").GetInt32(),
                Title = e.GetProperty("title").GetString() ?? string.Empty,
                Overview = e.TryGetProperty("overview", out var ov) && ov.ValueKind == JsonValueKind.String ? ov.GetString() ?? string.Empty : string.Empty,
                PosterPath = e.TryGetProperty("poster_path", out var p) && p.ValueKind != JsonValueKind.Null ? p.GetString() : null,
                ReleaseDate = e.TryGetProperty("release_date", out var rd) && rd.ValueKind == JsonValueKind.String ? rd.GetString() : null,
                Rating = e.TryGetProperty("vote_average", out var va) && va.ValueKind != JsonValueKind.Null ? va.GetDecimal() : (decimal?)null
            })
            .OrderBy(_ => rand.Next())
            .Take(desired)
            .ToList();

        return await EnrichMovies(client, items);
    }

    private async Task<List<MovieDto>> EnrichMovies(HttpClient client, IEnumerable<dynamic> items)
    {
        var semaphore = new SemaphoreSlim(8);
        var tasks = items.Select(async m =>
        {
            await semaphore.WaitAsync();
            try
            {
                var detailsUrl = $"https://api.themoviedb.org/3/movie/{m.Id}?api_key={_apiKey}&append_to_response=credits";
                var detailsResp = await client.GetAsync(detailsUrl);
                if (!detailsResp.IsSuccessStatusCode)
                {
                    
                    return new MovieDto
                    {
                        Id = m.Id,
                        Title = m.Title,
                        Year = ParseYear(m.ReleaseDate),
                        Director = null,
                        Rating = m.Rating,
                        Poster = MakePosterUrl(m.PosterPath),
                        Description = m.Overview
                    };
                }

                using var detailsDoc = JsonDocument.Parse(await detailsResp.Content.ReadAsStreamAsync());
                var root = detailsDoc.RootElement;

                string? director = null;
                if (root.TryGetProperty("credits", out var credits) &&
                    credits.TryGetProperty("crew", out var crew) &&
                    crew.ValueKind == JsonValueKind.Array)
                {
                    var dir = crew.EnumerateArray()
                        .FirstOrDefault(c => c.TryGetProperty("job", out var job) && job.GetString() == "Director");
                    if (dir.ValueKind != JsonValueKind.Undefined && dir.TryGetProperty("name", out var dname))
                    {
                        director = dname.GetString();
                    }
                }

                decimal? rating = null;
                if (root.TryGetProperty("vote_average", out var voteAvg) && voteAvg.ValueKind != JsonValueKind.Null)
                {
                    if (voteAvg.TryGetDecimal(out var d)) rating = d;
                }

                string? overview = null;
                if (root.TryGetProperty("overview", out var ov2) && ov2.ValueKind == JsonValueKind.String)
                {
                    overview = ov2.GetString();
                }

                string? posterPath = null;
                if (root.TryGetProperty("poster_path", out var pp) && pp.ValueKind != JsonValueKind.Null)
                {
                    posterPath = pp.GetString();
                }

                string? releaseDate = null;
                if (root.TryGetProperty("release_date", out var rd2) && rd2.ValueKind == JsonValueKind.String)
                {
                    releaseDate = rd2.GetString();
                }

                return new MovieDto
                {
                    Id = m.Id,
                    Title = m.Title,
                    Year = ParseYear(releaseDate) ?? ParseYear(m.ReleaseDate),
                    Director = director,
                    Rating = rating ?? m.Rating,
                    Poster = MakePosterUrl(posterPath ?? m.PosterPath),
                    Description = overview ?? m.Overview
                };
            }
            finally
            {
                semaphore.Release();
            }
        }).ToList();

        var detailed = await Task.WhenAll(tasks);
        return detailed.Where(x => x != null).ToList();
    }

    private static string? MakePosterUrl(string? posterPath)
    {
        if (string.IsNullOrWhiteSpace(posterPath))
            return null;
        return $"{TmdbImageBase}{posterPath}";
    }

    private static int? ParseYear(string? releaseDate)
    {
        if (string.IsNullOrWhiteSpace(releaseDate))
            return null;
        if (DateTime.TryParse(releaseDate, out var dt))
            return dt.Year;
        if (releaseDate.Length >= 4 && int.TryParse(releaseDate.Substring(0, 4), out var y))
            return y;
        return null;
    }

    private class MovieDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public int? Year { get; set; }
        public string? Director { get; set; }
        public decimal? Rating { get; set; }
        public string? Poster { get; set; }
        public string Description { get; set; } = string.Empty;
    }
}

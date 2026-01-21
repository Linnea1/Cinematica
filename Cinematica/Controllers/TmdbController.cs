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

    // NOTE: This endpoint requires a `listId` query parameter and will always return the full list.
    [HttpGet("deck")]
    public async Task<IActionResult> GetDeck([FromQuery] string? listId)
    {
        if (string.IsNullOrWhiteSpace(listId))
            return BadRequest(new { error = "listId query parameter is required" });

        var cacheKey = $"tmdb_list_{listId}";
        if (_cache.TryGetValue(cacheKey, out object? cached))
        {
            if (cached is MovieDto[] cachedArr)
                _logger.LogInformation("Returning cached TMDb list {ListId} with {Count} movies", listId, cachedArr.Length);
            else
                _logger.LogInformation("Returning cached TMDb list {ListId}", listId);

            return Ok(cached);
        }

        var client = _httpFactory.CreateClient();

        var baseUrl = $"https://api.themoviedb.org/3/list/{listId}";
        var q = new Dictionary<string, string?>
        {
            ["api_key"] = _apiKey,
            ["language"] = "en-US"
        };

        var listUrl = QueryHelpers.AddQueryString(baseUrl, q);
        var resp = await client.GetAsync(listUrl);
        if (!resp.IsSuccessStatusCode)
        {
            var content = await resp.Content.ReadAsStringAsync();
            _logger.LogWarning("TMDb list fetch failed for {ListId}: {Status} {Content}", listId, (int)resp.StatusCode, content);
            return StatusCode((int)resp.StatusCode, new { error = "TMDb list fetch failed", status = (int)resp.StatusCode, body = content });
        }

        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStreamAsync());
        if (!doc.RootElement.TryGetProperty("items", out var itemsElement) || itemsElement.ValueKind != JsonValueKind.Array)
        {
            _logger.LogWarning("TMDb list {ListId} has no items", listId);
            _cache.Set(cacheKey, Array.Empty<MovieDto>(), TimeSpan.FromMinutes(10));
            return Ok(Array.Empty<MovieDto>());
        }

        // LOG: raw JSON array length from TMDb and parsed intermediate count
        try
        {
            int rawCount = itemsElement.GetArrayLength();
            _logger.LogInformation("TMDb list {ListId} raw JSON items length: {RawCount}", listId, rawCount);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not get raw array length for TMDb list {ListId}", listId);
        }

        var items = itemsElement.EnumerateArray()
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

        _logger.LogInformation("TMDb list {ListId} parsed intermediate items count: {ParsedCount}", listId, items.Count);

        // Enrich all items (keeps the list order)
        var pool = await EnrichMovies(client, items);

        // Log the number of movies fetched/enriched
        _logger.LogInformation("TMDb list {ListId} fetched and enriched {Count} movies", listId, pool.Count);

        _cache.Set(cacheKey, pool.ToArray(), TimeSpan.FromMinutes(10));
        return Ok(pool.ToArray());
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

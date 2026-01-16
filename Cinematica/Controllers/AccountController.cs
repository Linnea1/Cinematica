using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity;
using Cinematica.Services;
using Cinematica.Model;
using Cinematica.Data;
using Microsoft.EntityFrameworkCore;

namespace Cinematica.Controllers;

[ApiController]
[Route("")]
public class AccountController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly ApplicationDbContext _db;

    public AccountController(IAuthService auth, ApplicationDbContext db)
    {
        _auth = auth;
        _db = db;
    }

    [HttpGet("login")]
    public IActionResult LoginForm()
    {
        var html = """
        <html>
          <body>
            <h2>Sign in</h2>
            <form method="post" action="/login">
              <label>Username: <input name="username" /></label><br/>
              <label>Password: <input name="password" type="password" /></label><br/>
              <button type="submit">Sign in</button>
            </form>
            <p><a href="/register">Register</a></p>
          </body>
        </html>
        """;
        return Content(html, "text/html");
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromForm] string username, [FromForm] string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return Redirect("/login");

        var normalized = username.ToUpperInvariant();
        var user = await _auth.FindByNormalizedUserNameAsync(normalized);
        if (user is null || !await _auth.ValidatePasswordAsync(user, password))
            return Content("Invalid credentials. <a href=\"/login\">Try again</a>", "text/html");

        var principal = _auth.CreatePrincipal(user);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        var prop = user.GetType().GetProperty("LastLoginAt");
        if (prop != null) prop.SetValue(user, DateTime.UtcNow);
        await _db.SaveChangesAsync();

        return Redirect("/protected");
    }

    [HttpGet("register")]
    public IActionResult RegisterForm()
    {
        var html = """
        <html>
          <body>
            <h2>Register</h2>
            <form method="post" action="/register">
              <label>Username: <input name="username" required /></label><br/>
              <label>Email: <input name="email" type="email" /></label><br/>
              <label>Display name: <input name="displayName" /></label><br/>
              <label>Password: <input name="password" type="password" required /></label><br/>
              <button type="submit">Register</button>
            </form>
            <p><a href="/login">Sign in</a></p>
          </body>
        </html>
        """;
        return Content(html, "text/html");
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromForm] string username,
        [FromForm] string password,
        [FromForm] string? displayName,
        [FromForm] string? email)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return BadRequest("username and password required");

        var normalized = username.ToUpperInvariant();

        if (await _db.Users.AnyAsync(u => u.NormalizedUserName == normalized))
            return Conflict("User already exists. <a href=\"/login\">Sign in</a>");

        var user = new User
        {
            UserName = username,
            NormalizedUserName = normalized,
            Email = email ?? string.Empty,
            NormalizedEmail = string.IsNullOrWhiteSpace(email) ? string.Empty : email!.ToUpperInvariant(),
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? username : displayName,
            SecurityStamp = Guid.NewGuid().ToString()
        };

        var hasher = new PasswordHasher<User>();
        user.PasswordHash = hasher.HashPassword(user, password);

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        return Redirect("/login");
    }

    [HttpGet("me")]
    public IActionResult Me()
    {
        if (!User.Identity?.IsAuthenticated ?? true)
            return Unauthorized();

        var userName = User.Identity?.Name;
        var displayName = User.FindFirst("display_name")?.Value;

        return Ok(new
        {
            isAuthenticated = true,
            userName,
            displayName
        });
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return Redirect("/");
    }
}

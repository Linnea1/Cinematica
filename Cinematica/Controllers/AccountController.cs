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
    public IActionResult LoginForm() => NotFound();

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromForm] string username, [FromForm] string password)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return BadRequest(new { success = false, message = "username and password required" });

        var normalized = username.ToUpperInvariant();
        var user = await _auth.FindByNormalizedUserNameAsync(normalized);
        if (user is null || !await _auth.ValidatePasswordAsync(user, password))
            return Unauthorized(new { success = false, message = "Invalid credentials" });

        var principal = _auth.CreatePrincipal(user);
        await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

        var prop = user.GetType().GetProperty("LastLoginAt");
        if (prop != null) prop.SetValue(user, DateTime.UtcNow);
        await _db.SaveChangesAsync();

        return Ok(new { success = true, redirect = "/protected", userName = user.UserName });
    }

    [HttpGet("register")]
    public IActionResult RegisterForm() => NotFound();

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromForm] string username,
        [FromForm] string password,
        [FromForm] string? displayName,
        [FromForm] string? email)
    {
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password))
            return BadRequest(new { success = false, message = "username and password required" });

        var normalized = username.ToUpperInvariant();

        if (await _db.Users.AnyAsync(u => u.NormalizedUserName == normalized))
            return Conflict(new { success = false, message = "User already exists" });

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

        return Ok(new { success = true, message = "Registered" });
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
        return Ok(new { success = true, redirect = "/" });
    }
}

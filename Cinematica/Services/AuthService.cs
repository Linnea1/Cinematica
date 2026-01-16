using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Cinematica.Data;
using Cinematica.Model;

namespace Cinematica.Services;

public class AuthService : IAuthService
{
    private readonly ApplicationDbContext _db;
    private readonly PasswordHasher<User> _hasher;

    public AuthService(ApplicationDbContext db)
    {
        _db = db;
        _hasher = new PasswordHasher<User>();
    }

    public async Task<User?> FindByNormalizedUserNameAsync(string normalizedUserName)
    {
        return await _db.Users.SingleOrDefaultAsync(u => u.NormalizedUserName == normalizedUserName);
    }

    public Task<bool> ValidatePasswordAsync(User user, string password)
    {
        var result = _hasher.VerifyHashedPassword(user, user.PasswordHash, password);
        return Task.FromResult(result == PasswordVerificationResult.Success);
    }

    public ClaimsPrincipal CreatePrincipal(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, user.UserName),
            new Claim("display_name", user.DisplayName ?? user.UserName)
        };
        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        return new ClaimsPrincipal(identity);
    }
}

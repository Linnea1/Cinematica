using System.Security.Claims;
using System.Threading.Tasks;
using Cinematica.Model;

namespace Cinematica.Services;

public interface IAuthService
{
    Task<User?> FindByNormalizedUserNameAsync(string normalizedUserName);
    Task<bool> ValidatePasswordAsync(User user, string password);
    ClaimsPrincipal CreatePrincipal(User user);
}

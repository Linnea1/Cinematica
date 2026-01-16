using System;
using System.Collections.Generic;

namespace Cinematica.Model
{
    public class User
    {
        // Primary key
        public Guid Id { get; set; } = Guid.NewGuid();

        // Authentication
        public string UserName { get; set; } = null!;
        public string NormalizedUserName { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string NormalizedEmail { get; set; } = null!;
        public bool EmailConfirmed { get; set; }

        // Hashed password (store only the hash)
        public string PasswordHash { get; set; } = null!;
        public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();
        // Profile
        public string? DisplayName { get; set; }

        // Roles/claims (simple representation)
        public ICollection<UserRole> Roles { get; set; } = new List<UserRole>();
    }

    public class UserRole
    {
        public int Id { get; set; }
        public Guid UserId { get; set; }
        public string RoleName { get; set; } = null!;
    }
}

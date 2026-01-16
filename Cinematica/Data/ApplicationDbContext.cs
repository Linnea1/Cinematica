using Microsoft.EntityFrameworkCore;
using Cinematica.Model;

namespace Cinematica.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<UserRole> UserRoles { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<User>(b =>
        {
            b.ToTable("Users");
            b.HasKey(u => u.Id);

            b.HasIndex(u => u.NormalizedUserName).IsUnique();
            b.HasIndex(u => u.NormalizedEmail);

            b.Property(u => u.UserName).IsRequired().HasMaxLength(256);
            b.Property(u => u.NormalizedUserName).IsRequired().HasMaxLength(256);
            b.Property(u => u.Email).HasMaxLength(256);
            b.Property(u => u.NormalizedEmail).HasMaxLength(256);
            b.Property(u => u.PasswordHash).IsRequired();
            b.Property(u => u.SecurityStamp).HasMaxLength(128);
            b.Property(u => u.DisplayName).HasMaxLength(200);

            b.HasMany(u => u.Roles)
             .WithOne()
             .HasForeignKey(r => r.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<UserRole>(b =>
        {
            b.ToTable("UserRoles");
            b.HasKey(r => r.Id);
            b.Property(r => r.RoleName).IsRequired().HasMaxLength(256);
        });
    }
}

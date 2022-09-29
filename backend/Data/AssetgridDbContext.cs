using assetgrid_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace assetgrid_backend.Data
{
    public class AssetgridDbContext : DbContext
    {
        public AssetgridDbContext(DbContextOptions<AssetgridDbContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<User>(entity =>
            {
                entity.HasIndex(e => e.NormalizedEmail).IsUnique();
                entity.HasMany(e => e.Accounts)
                    .WithOne(e => e.User);
                entity.HasOne(e => e.Preferences)
                    .WithOne(e => e.User);
            });

            builder.Entity<Account>(entity =>
            {
                entity.HasMany(e => e.Users)
                    .WithOne(e => e.Account);
            });

            builder.Entity<Transaction>(entity => {
                entity.HasIndex(e => e.Identifier);
                entity.HasIndex(e => e.DateTime);
                entity.HasIndex(e => e.Category).HasFilter("Category IS NOT NULL");
            });
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<UserAccount> UserAccounts { get; set; } = null!;
        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<TransactionLine> TransactionLines { get; set; } = null!;
        public DbSet<UserPreferences> UserPreferences { get; set; } = null!;
    }
}

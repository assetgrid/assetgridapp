using assetgrid_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace assetgrid_backend.Data
{
    public class HomebudgetContext : DbContext
    {
        public HomebudgetContext(DbContextOptions<HomebudgetContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<Transaction>(entity => {
                entity.HasIndex(e => e.Identifier).IsUnique();
            });
            builder.Entity<Category>(entity =>
            {
                entity.HasIndex(e => e.NormalizedName).IsUnique();
            });
        }

        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<TransactionLine> TransactionLines { get; set; } = null!;
        public DbSet<Category> Categories { get; set; } = null!;

        public DbSet<UserPreferences> UserPreferences { get; set; } = null!;
    }
}

using homebudget_server.Models;
using Microsoft.EntityFrameworkCore;

namespace homebudget_server.Data
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
                entity.HasIndex(e => e.Category).HasFilter("[Category] != ''");
            });
        }

        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<TransactionLine> TransactionLines { get; set; } = null!;

        public DbSet<UserPreferences> UserPreferences { get; set; } = null!;
    }
}

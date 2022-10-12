using assetgrid_backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Text.Json;

namespace assetgrid_backend.Models
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
                entity.HasMany(e => e.CsvImportProfiles)
                    .WithOne(e => e.User);
            });

            builder.Entity<Account>(entity =>
            {
                entity.HasMany(e => e.Users)
                    .WithOne(e => e.Account);
                entity.HasMany(e => e.Identifiers)
                    .WithOne(e => e.Account)
                    .HasForeignKey(e => e.AccountId)
                    .HasPrincipalKey(e => e.Id);
            });

            builder.Entity<Transaction>(entity => {
                entity.HasIndex(e => e.DateTime);
                entity.HasIndex(e => e.Category).HasFilter("Category IS NOT NULL");
                entity.HasMany(e => e.Identifiers)
                    .WithOne(e => e.Transaction)
                    .HasForeignKey(e => e.TransactionId)
                    .HasPrincipalKey(e => e.Id);
            });

            builder.Entity<TransactionUniqueIdentifier>(entity =>
            {
                entity.HasIndex(e => e.Identifier);
            });

            builder.Entity<UserCsvImportProfile>(entity =>
            {
                var valueConverter = new ValueConverter<CsvImportProfile, string>(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<CsvImportProfile>(v, (JsonSerializerOptions?)null) ?? new CsvImportProfile()
                );
                entity.Property("ImportProfile")
                    .HasConversion(valueConverter)
                    .HasColumnType("json");
            });
        }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Account> Accounts { get; set; } = null!;
        public DbSet<AccountUniqueIdentifier> AccountUniqueIdentifiers { get; set; } = null!;
        public DbSet<UserAccount> UserAccounts { get; set; } = null!;
        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<TransactionLine> TransactionLines { get; set; } = null!;
        public DbSet<TransactionUniqueIdentifier> TransactionUniqueIdentifiers { get; set; } = null!;
        public DbSet<UserPreferences> UserPreferences { get; set; } = null!;
        public DbSet<UserCsvImportProfile> UserCsvImportProfiles { get; set; } = null!;
    }
}

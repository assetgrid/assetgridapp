using assetgrid_backend.models.Automation;
using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.Search;
using assetgrid_backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Data.Entity.Core.Objects;
using System.Data.Entity.Infrastructure;
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

            builder.Entity<Transaction>(entity =>
            {
                entity.HasIndex(e => e.DateTime);
                entity.HasMany(e => e.Identifiers)
                    .WithOne(e => e.Transaction)
                    .HasForeignKey(e => e.TransactionId)
                    .HasPrincipalKey(e => e.Id);
            });
            builder.Entity<TransactionLine>(entity =>
            {
                entity.HasIndex(e => e.Category).HasFilter("Category IS NOT NULL");
            });

            builder.Entity<TransactionUniqueIdentifier>(entity =>
            {
                entity.HasIndex(e => e.Identifier);
            });
            builder.Entity<TransactionAutomation>(entity =>
            {
                var queryValueConverter = new ValueConverter<SearchGroup, string>(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<SearchGroup>(v, (JsonSerializerOptions?)null) ?? new SearchGroup
                    {
                        Type = SearchGroupType.And,
                        Children = new List<SearchGroup>()
                    }
                );
                entity.Property(e => e.Query)
                    .HasConversion(queryValueConverter, new ValueComparer<SearchGroup>((a, b) => a != null ? a.Equals(b) : a == b, x => x.GetHashCode(), x => x))
                    .HasColumnType("json");

                var actionsValueConverter = new ValueConverter<List<TransactionAutomationAction>, string>(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => JsonSerializer.Deserialize<List<TransactionAutomationAction>>(v, (JsonSerializerOptions?)null) ?? new List<TransactionAutomationAction>()
                );
                entity.Property(e => e.Actions)
                    .HasConversion(actionsValueConverter, new ValueComparer<List<TransactionAutomationAction>>(
                        (a, b) => (a == null && b == null) || (a != null && b != null && a.SequenceEqual(b)),
                        x => x.Aggregate(0, (a, v) => HashCode.Combine(a, v.GetHashCode())),
                        x => x.ToList()))
                    .HasColumnType("json");
            });

            builder.Entity<UserCsvImportProfile>(entity =>
            {
                var valueConverter = new ValueConverter<CsvImportProfile, string>(
                    v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                    v => UserCsvImportProfile.ParseJson(v)
                );
                entity.Property(e => e.ImportProfile)
                    .HasConversion(valueConverter)
                    .HasColumnType("json");
            });

            #region Transaction metadata

            builder.Entity<Transaction>(entity =>
            {
                entity.HasMany(x => x.MetaAccountValues)
                    .WithOne(x => x.Object);
                entity.HasMany(x => x.MetaAttachmentValues)
                    .WithOne(x => x.Object);
                entity.HasMany(x => x.MetaBooleanValues)
                    .WithOne(x => x.Object);
                entity.HasMany(x => x.MetaTextLineValues)
                    .WithOne(x => x.Object);
                entity.HasMany(x => x.MetaTextLongValues)
                    .WithOne(x => x.Object);
                entity.HasMany(x => x.MetaNumberValues)
                    .WithOne(x => x.Object);
                entity.HasMany(x => x.MetaTransactionValues)
                    .WithOne(x => x.Object);
            });

            #endregion
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
        public DbSet<TransactionAutomation> TransactionAutomations { get; set; } = null!;
        public DbSet<UserTransactionAutomation> UserTransactionAutomations { get; set; } = null!;
        public DbSet<MetaField> MetaFields { get; set; } = null!;
        public DbSet<UserMetaField> UserMetaFields { get; set; } = null!;

        #region Meta field value tables
        public DbSet<Attachment> Attachments { get; set; } = null!;

        #region Transaction
        public DbSet<MetaTextLine<Transaction>> TransactionMetaTextLine { get; set; } = null!;
        public DbSet<MetaTextLong<Transaction>> TransactionMetaTextLong { get; set; } = null!;
        public DbSet<MetaTransaction<Transaction>> TransactionMetaTransaction { get; set; } = null!;
        public DbSet<MetaAccount<Transaction>> TransactionMetaAccount { get; set; } = null!;
        public DbSet<MetaAttachment<Transaction>> TransactionMetaAttachment { get; set; } = null!;
        public DbSet<MetaBoolean<Transaction>> TransactionMetaBoolean { get; set; } = null!;
        public DbSet<MetaNumber<Transaction>> TransactionMetaNumber { get; set; } = null!;
        #endregion

        #endregion
    }
}

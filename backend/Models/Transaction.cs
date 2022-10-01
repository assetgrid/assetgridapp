using assetgrid_backend.ViewModels;
using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class Transaction : IValidatableObject
    {
        public int Id { get; set; }
        public int? SourceAccountId { get; set; }
        public virtual Account? SourceAccount { get; set; }
        public int? DestinationAccountId { get; set; }
        public virtual Account? DestinationAccount { get; set; }
        public DateTime DateTime { get; set; }
        public string? Identifier { get; set; }
        public string Description { get; set; } = null!;
        public long Total { get; set; }
        public string Category { get; set; } = null!;

        public virtual List<TransactionLine> TransactionLines { get; set; } = null!;

        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (SourceAccountId == null && DestinationAccountId == null)
            {
                yield return new ValidationResult(
                    $"Either source or destination id must be set.",
                    new[] { nameof(SourceAccountId), nameof(DestinationAccountId) });
            }
            else if (SourceAccountId == DestinationAccountId)
            {
                yield return new ValidationResult(
                    $"Source and destination must be different.",
                    new[] { nameof(SourceAccountId), nameof(DestinationAccountId) });
            }

            if (TransactionLines.Count > 0 && Total != TransactionLines.Select(line => line.Amount).Sum())
            {
                yield return new ValidationResult(
                    $"Sum of line amounts does not match transaction total",
                    new[] { nameof(Total), nameof(TransactionLines) });
            }
        }
    }

    public static class TransactionQueryableExtensions
    {
        public static IQueryable<ViewTransaction> SelectView(this IQueryable<Transaction> query, int userId)
        {
            return query.Select(transaction => new ViewTransaction
            {
                Id = transaction.Id,
                DateTime = transaction.DateTime,
                Description = transaction.Description,
                Source = transaction.SourceAccount != null
                        ? transaction.SourceAccount.Users!.SingleOrDefault(user => user.UserId == userId) == null ? ViewAccount.GetNoReadAccess(transaction.SourceAccount.Id) : new ViewAccount(
                            transaction.SourceAccount.Id,
                            transaction.SourceAccount.Name,
                            transaction.SourceAccount.Description,
                            transaction.SourceAccount.AccountNumber,
                            transaction.SourceAccount.Users!.Single(user => user.UserId == userId).Favorite,
                            transaction.SourceAccount.Users!.Single(user => user.UserId == userId).IncludeInNetWorth,
                            ViewAccount.PermissionsFromDbPermissions(transaction.SourceAccount.Users!.Single(user => user.UserId == userId).Permissions),
                            0
                        ) : null,
                Destination = transaction.DestinationAccount != null
                        ? transaction.DestinationAccount.Users!.SingleOrDefault(user => user.UserId == userId) == null ? ViewAccount.GetNoReadAccess(transaction.DestinationAccount.Id) : new ViewAccount(
                            transaction.DestinationAccount.Id,
                            transaction.DestinationAccount.Name,
                            transaction.DestinationAccount.Description,
                            transaction.DestinationAccount.AccountNumber,
                            transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).Favorite,
                            transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).IncludeInNetWorth,
                            ViewAccount.PermissionsFromDbPermissions(transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).Permissions),
                            0
                        ) : null,
                Identifier = transaction.Identifier,
                Category = transaction.Category,
                Lines = transaction.TransactionLines
                    .OrderBy(line => line.Order)
                    .Select(line => new ViewTransactionLine(line.Amount, line.Description))
                    .ToList(),
                Total = transaction.Total
            });
        }
    }
}

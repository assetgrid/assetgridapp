using homebudget_server.Models.ViewModels;
using System.ComponentModel.DataAnnotations;

namespace homebudget_server.Models
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
        public int? CategoryId { get; set; }
        public virtual Category? Category { get; set; } = null!;

        public virtual List<TransactionLine> TransactionLines { get; set; } = null!;

        IEnumerable<ValidationResult> IValidatableObject.Validate(ValidationContext validationContext)
        {
            if (SourceAccountId == null && DestinationAccountId == null)
            {
                yield return new ValidationResult(
                    $"Either source or destination id must be set.",
                    new[] { nameof(SourceAccountId), nameof(DestinationAccountId) });
            }
            if (SourceAccountId == DestinationAccountId)
            {
                yield return new ValidationResult(
                    $"Source and destination must be different.",
                    new[] { nameof(SourceAccountId), nameof(DestinationAccountId) });
            }
        }
    }

    public static class TransactionQueryableExtensions
    {
        public static IQueryable<ViewTransaction> SelectView(this IQueryable<Transaction> query)
        {
            return query.Select(transaction => new ViewTransaction
            {
                Id = transaction.Id,
                DateTime = transaction.DateTime,
                Description = transaction.Description,
                Source = transaction.SourceAccount != null
                        ? new ViewAccount
                        {
                            Id = transaction.SourceAccount.Id,
                            Description = transaction.SourceAccount.Description,
                            Name = transaction.SourceAccount.Name,
                            AccountNumber = transaction.SourceAccount.AccountNumber
                        } : null,
                Destination = transaction.DestinationAccount != null
                        ? new ViewAccount
                        {
                            Id = transaction.DestinationAccount.Id,
                            Description = transaction.DestinationAccount.Description,
                            Name = transaction.DestinationAccount.Name,
                            AccountNumber = transaction.DestinationAccount.AccountNumber
                        } : null,
                Identifier = transaction.Identifier,
                Category = transaction.Category == null ? "" : transaction.Category.Name,
                Lines = transaction.TransactionLines
                    .OrderBy(line => line.Order)
                    .Select(line => new ViewTransactionLine
                    {
                        Amount = line.Amount,
                    }).ToList(),
                Total = transaction.TransactionLines.Select(line => line.Amount).Sum()
            });
        }
    }
}

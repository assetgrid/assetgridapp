using homebudget_server.Models.ViewModels;

namespace homebudget_server.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public int? SourceAccountId { get; set; }
        public virtual Account? SourceAccount { get; set; }
        public int? DestinationAccountId { get; set; }
        public virtual Account? DestinationAccount { get; set; }
        public DateTime DateTime { get; set; }
        public string? Identifier { get; set; }
        public string Description { get; set; } = null!;
        public decimal Total { get; set; }

        public virtual List<TransactionLine> TransactionLines { get; set; } = null!;
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

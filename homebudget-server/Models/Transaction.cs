using homebudget_server.Models.ViewModels;

namespace homebudget_server.Models
{
    public class Transaction
    {
        public int Id { get; set; }
        public int? FromAccountId { get; set; }
        public virtual Account? FromAccount { get; set; }
        public int? ToAccountId { get; set; }
        public virtual Account? ToAccount { get; set; }
        public DateTime DatetimeCreated { get; set; }
        public string? Identifier { get; set; }
        public string Description { get; set; } = null!;

        public virtual List<TransactionLine> TransactionLines { get; set; } = null!;

        public ViewTransaction ToView()
        {
            return new ViewTransaction
            {
                Id = Id,
                Identifier = Identifier,
                Created = DatetimeCreated,
                Description = Description,
                From = FromAccount != null
                    ? new ViewAccount
                    {
                        Id = Id,
                        Name = FromAccount.Name,
                        Description = FromAccount.Description,
                    } : null,
                To = ToAccount != null
                    ? new ViewAccount
                    {
                        Id = Id,
                        Name = ToAccount.Name,
                        Description = ToAccount.Description,
                    } : null,
                Lines = TransactionLines
                .OrderBy(line => line.Order)
                .Select(line => new ViewTransactionLine
                {
                    Amount = line.Amount,
                }).ToList(),
            };
        }
    }
}

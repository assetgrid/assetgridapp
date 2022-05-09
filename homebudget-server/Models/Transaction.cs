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

        public virtual List<TransactionLine> TransactionLines { get; set; } = null!;
    }
}

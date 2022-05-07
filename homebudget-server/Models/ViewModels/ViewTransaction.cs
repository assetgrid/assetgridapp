namespace homebudget_server.Models.ViewModels
{
    public class ViewCreateTransaction
    {
        public int? FromId { get; set; }
        public int? ToId { get; set; }
        public DateTime Created { get; set; }
        public string Description { get; set; } = null!;
        public string? Identifier { get; set; }
        public List<ViewTransactionLine> Lines { get; set; } = null!;
    }

    public class ViewTransaction
    {
        public int Id { get; set; }
        public ViewAccount? From { get; set; }
        public ViewAccount? To { get; set; }
        public DateTime Created { get; set; }
        public string Description { get; set; } = null!;
        public string? Identifier { get; set; }
        public List<ViewTransactionLine> Lines { get; set; } = null!;
    }

    public class ViewTransactionLine
    {
        public decimal Amount { get; set; }
        public string Description { get; set; } = null!;
    }
}

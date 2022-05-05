namespace homebudget_server.Models.ViewModels
{
    public class CreateViewTransaction
    {
        public int? FromId { get; set; }
        public int? ToId { get; set; }
        public DateTime Created { get; set; }
        public string Description { get; set; }
        public string Identifier { get; set; }
        public List<ViewTransactionLine> Lines { get; set; }
    }

    public class ViewTransaction
    {
        public int Id { get; set; }
        public ViewAccount? From { get; set; }
        public ViewAccount? To { get; set; }
        public DateTime Created { get; set; }
        public string Description { get; set; }
        public string Identifier { get; set; }
        public List<ViewTransactionLine> Lines { get; set; }
    }

    public class ViewTransactionLine
    {
        public decimal Amount { get; set; }
        public string Description { get; set; }
    }
}

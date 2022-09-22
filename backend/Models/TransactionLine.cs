namespace assetgrid_backend.Models
{
    public class TransactionLine
    {
        public int Id { get; set; }
        public int TransactionId { get; set; }
        public int Order { get; set; }
        public virtual Transaction Transaction { get; set; } = null!;
        public long Amount { get; set; }
        public string Description { get; set; } = null!;
    }
}

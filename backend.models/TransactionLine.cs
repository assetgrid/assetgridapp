using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class TransactionLine
    {
        public int Id { get; set; }
        public int TransactionId { get; set; }
        public int Order { get; set; }
        public required virtual Transaction Transaction { get; set; }
        public long Amount { get; set; }

        [MaxLength(250)]
        public required string Description { get; set; }

        [MaxLength(50)]
        public required string Category { get; set; }
    }
}

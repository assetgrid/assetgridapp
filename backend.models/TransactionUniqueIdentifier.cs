using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.models
{
    public class TransactionUniqueIdentifier
    {
        public int Id { get; set; }
        public int TransactionId { get; set; }
        public virtual Transaction Transaction { get; set; } = null!;

        [MaxLength(100)]
        public string Identifier { get; set; } = null!;
    }
}

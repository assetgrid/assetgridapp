using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class AccountUniqueIdentifier
    {
        public int Id { get; set; }
        public int AccountId { get; set; }
        public virtual Account Account { get; set; } = null!;

        [MaxLength(100)]
        public string Identifier { get; set; } = null!;
    }
}

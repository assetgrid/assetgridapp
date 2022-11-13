using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class Account
    {
        public int Id { get; set; }

        [MaxLength(50)]
        public required string Name { get; set; }

        [MaxLength(250)]
        public required string Description { get; set; }

        public virtual List<UserAccount>? Users { get; set; }
        public virtual List<AccountUniqueIdentifier>? Identifiers { get; set; }
    }
}

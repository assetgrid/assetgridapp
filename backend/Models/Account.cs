using assetgrid_backend.ViewModels;
using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class Account
    {
        public int Id { get; set; }

        [MaxLength(50)]
        public string Name { get; set; } = null!;

        [MaxLength(250)]
        public string Description { get; set; } = null!;

        [MaxLength(30)]
        public string? AccountNumber { get; set; }

        public virtual List<UserAccount>? Users { get; set; }
    }
}

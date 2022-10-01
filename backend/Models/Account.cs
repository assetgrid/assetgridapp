using assetgrid_backend.ViewModels;

namespace assetgrid_backend.Models
{
    public class Account
    {
        public int Id { get; set; }
        public string Name { get; set; } = null!;
        public string Description { get; set; } = null!;
        public string? AccountNumber { get; set; }
        public virtual List<UserAccount>? Users { get; set; }
    }
}

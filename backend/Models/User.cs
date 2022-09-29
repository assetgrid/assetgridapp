namespace assetgrid_backend.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; } = null!;
        public string NormalizedEmail { get; set; } = null!;
        public string HashedPassword { get; set; } = null!;
        public virtual UserPreferences Preferences { get; set; } = null!;
        public virtual List<UserAccount> Accounts { get; set; } = null!;
    }
}

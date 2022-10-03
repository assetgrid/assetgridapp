using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class User
    {
        public int Id { get; set; }

        [MaxLength(100)]
        public string Email { get; set; } = null!;
        [MaxLength(100)]
        public string NormalizedEmail { get; set; } = null!;
        [MaxLength(255)]
        public string HashedPassword { get; set; } = null!;
        public virtual UserPreferences Preferences { get; set; } = null!;
        public virtual List<UserAccount> Accounts { get; set; } = null!;
        public virtual List<UserCsvImportProfile> CsvImportProfiles { get; set; } = null!;
    }
}

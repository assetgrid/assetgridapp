using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class User
    {
        public int Id { get; set; }

        [MaxLength(100)]
        public required string Email { get; set; }
        [MaxLength(100)]
        public required string NormalizedEmail { get; set; }
        [MaxLength(255)]
        public required string HashedPassword { get; set; }
        public virtual UserPreferences? Preferences { get; set; }
        public required virtual List<UserAccount> Accounts { get; set; }
        public required virtual List<UserCsvImportProfile> CsvImportProfiles { get; set; }
    }
}

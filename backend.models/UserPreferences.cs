using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class UserPreferences
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public required virtual User User { get; set; }
        public int DecimalDigits { get; set; }

        [MaxLength(10)]
        public required string DecimalSeparator { get; set; }

        [MaxLength(10)]
        public required string ThousandsSeparator { get; set; }

        [MaxLength(30)]
        public required string? DateFormat { get; set; }

        [MaxLength(100)]
        public required string? DateTimeFormat { get; set; }
    }
}

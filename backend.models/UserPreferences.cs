using System.ComponentModel.DataAnnotations;

namespace assetgrid_backend.Models
{
    public class UserPreferences
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;
        public int DecimalDigits { get; set; }

        [MaxLength(10)]
        public string DecimalSeparator { get; set; } = null!;

        [MaxLength(10)]
        public string ThousandsSeparator { get; set; } = null!;

        [MaxLength(30)]
        public string? DateFormat { get; set; } = null;

        [MaxLength(100)]
        public string? DateTimeFormat { get; set; } = null;
    }
}

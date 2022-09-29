namespace assetgrid_backend.Models
{
    public class UserPreferences
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public virtual User User { get; set; } = null!;
        public string DecimalSeparator { get; set; } = null!;
        public int DecimalDigits { get; set; }
        public string ThousandsSeparator { get; set; } = null!;
        public string? DateFormat { get; set; } = null;
        public string? DateTimeFormat { get; set; } = null;
    }
}

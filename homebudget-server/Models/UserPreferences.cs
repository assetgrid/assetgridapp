namespace homebudget_server.Models
{
    public class UserPreferences
    {
        public int Id { get; set; }
        public string DecimalSeparator { get; set; } = null!;
        public int DecimalDigits { get; set; }
        public string ThousandsSeparator { get; set; } = null!;
    }
}

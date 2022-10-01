using assetgrid_backend.Models;
using System.Text.Json.Serialization;

namespace assetgrid_backend.ViewModels
{
    public class ViewPreferences
    {
        public string DecimalSeparator { get; set; } = null!;
        public int DecimalDigits { get; set; }
        public string ThousandsSeparator { get; set; } = null!;
        public string? DateFormat { get; set; } = null!;
        public string? DateTimeFormat { get; set; } = null!;

        [JsonConstructor]
        public ViewPreferences(string decimalSeparator, int decimalDigits, string thousandsSeparator, string? dateFormat, string? dateTimeFormat)
        {
            DecimalSeparator = decimalSeparator;
            DecimalDigits = decimalDigits;
            DateTimeFormat = dateTimeFormat;
            DateFormat = dateFormat;
            ThousandsSeparator = thousandsSeparator;
        }

        public ViewPreferences (UserPreferences preferences)
        {
            DecimalSeparator = preferences.DecimalSeparator;
            DecimalDigits = preferences.DecimalDigits;
            DateTimeFormat = preferences.DateTimeFormat;
            DateFormat = preferences.DateFormat;
            ThousandsSeparator = preferences.ThousandsSeparator;
        }
    }
}

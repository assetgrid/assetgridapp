using assetgrid_backend.Models;
using System.ComponentModel.DataAnnotations;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;

namespace assetgrid_backend.Models.ViewModels
{
    public class ViewPreferences
    {
        [MaxLength(10, ErrorMessage = "Decimal separator must be shorter than 3 characters.")]
        public string DecimalSeparator { get; set; }
        public int DecimalDigits { get; set; }

        [MaxLength(10, ErrorMessage = "Thousands separator must be shorter than 3 characters.")]
        public string ThousandsSeparator { get; set; }

        [MaxLength(30, ErrorMessage = "Date format must be shorter than 30 characters.")]
        public string? DateFormat { get; set; }

        [MaxLength(100, ErrorMessage = "Date and time format must be shorter than 100 characters.")]
        public string? DateTimeFormat { get; set; }

        public string Version => Config.Version;

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

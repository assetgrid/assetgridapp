﻿namespace assetgrid_backend.Models.ViewModels
{
    public class ViewPreferences
    {
        public int Id { get; set; }
        public string DecimalSeparator { get; set; } = null!;
        public int DecimalDigits { get; set; }
        public string ThousandsSeparator { get; set; } = null!;
        public string? DateFormat { get; set; } = null!;
        public string? DateTimeFormat { get; set; } = null!;
        public List<ViewAccount> FavoriteAccounts { get; set; } = null!;
    }
}
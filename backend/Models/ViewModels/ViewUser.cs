namespace assetgrid_backend.Models.ViewModels
{
    public class UserAuthenticatedResponse
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public ViewPreferences Preferences { get; set; }
        public List<ViewAccount> FavoriteAccounts { get; set; }
        public string Token { get; set; }

        public UserAuthenticatedResponse(int id, string email, ViewPreferences preferences, List<ViewAccount> favoriteAccounts, string token)
        {
            Id = id;
            Email = email;
            Preferences = preferences;
            FavoriteAccounts = favoriteAccounts;
            Token = token;
        }
    }

    public class AuthenticateModel
    {
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
    }
}

using System.ComponentModel.DataAnnotations;

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
        [MaxLength(100, ErrorMessage = "Email must be shorter than 100 characters.")]
        [MinLength(3, ErrorMessage = "Please enter your email address.")]
        public required string Email { get; set; }
        [MinLength(8, ErrorMessage = "Password must be at least 8 characters long.")]
        public required string Password { get; set; }
    }

    public class UpdatePasswordModel
    {
        public required string OldPassword { get; set; }
        public required string NewPassword { get; set; }
    }
}

using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace assetgrid_backend.Services
{
    public interface IUserService
    {
        Task<UserAuthenticatedResponse?> Authenticate(string email, string password);
        Task<User> CreateUser(string email, string password);
        UserPreferences GetPreferences(User user);
        Task<User> GetById(int id);
        User? GetCurrent(HttpContext context);
        Task<bool> ValidatePassword(User user, string password);
        void SetPassword (User user, string password);
    }

    public class UserService : IUserService
    {
        private readonly string _jwtSecret;
        private readonly AssetgridDbContext _context;

        public User? MockUser { get; set; }
        public UserService(JwtSecret secret, AssetgridDbContext context)
        {
            _jwtSecret = secret.Value;
            _context = context;
        }

        public async Task<UserAuthenticatedResponse?> Authenticate(string email, string password)
        {
            // Force entity framework to load favorite accounts for the user
            var user = await _context.Users
                .Include(user => user.Preferences)
                .Where(user => user.NormalizedEmail == email.ToLower())
                .Select(user => new
                {
                    user,
                    favoriteAccounts = _context.UserAccounts
                        .Include(account => account.Account)
                        .Include(account => account.Account.Identifiers)
                        .Where(account => account.Favorite && account.UserId == user.Id).ToList()
                }).SingleOrDefaultAsync();

            // return null if user not found
            if (user == null) return null;

            // Verify password
            if (! await ValidatePassword(user.user, password))
            {
                return null;
            }

            // authentication successful so generate jwt token
            var token = _generateJwtToken(user.user);

            return new UserAuthenticatedResponse(
                user.user.Id,
                user.user.Email,
                new ViewPreferences(GetPreferences(user.user)),
                user.favoriteAccounts.Select(account => new ViewAccount(
                    account.AccountId,
                    account.Account.Name,
                    account.Account.Description,
                    account.Account.Identifiers!.Select(x => x.Identifier).ToList(),
                    account.Favorite,
                    account.IncludeInNetWorth,
                    ViewAccount.PermissionsFromDbPermissions(account.Permissions),
                    0)).ToList(),
                token);
        }

        public async Task<bool> ValidatePassword(User user, string password)
        {
            var hasher = new PasswordHasher<string>();
            var result = hasher.VerifyHashedPassword(user.Email.ToLower(), user.HashedPassword, password);
            switch (result)
            {
                case PasswordVerificationResult.SuccessRehashNeeded:
                    user.HashedPassword = hasher.HashPassword(user.Email.ToLower(), password);
                    await _context.SaveChangesAsync();
                    return true;
                case PasswordVerificationResult.Success:
                    return true;
                default:
                    return false ;
            }
        }

        private string _getHashedPassword(string userEmail, string value)
        {
            var hasher = new PasswordHasher<string>();
            return hasher.HashPassword(userEmail.ToLower(), value);
        }

        public void SetPassword(User user, string password)
        {
            user.HashedPassword = _getHashedPassword(user.Email, password);
        }

        public async Task<User> CreateUser(string email, string password)
        {
            var user = new User
            {
                Email = email,
                NormalizedEmail = email.ToLower(),
                HashedPassword = _getHashedPassword(email, password),
                Accounts = new List<UserAccount>(),
                CsvImportProfiles = new List<UserCsvImportProfile>(),
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return user;
        }

        public UserPreferences GetPreferences(User user)
        {
            return _preferencesOrDefault(user, user.Preferences);
        }

        private UserPreferences _preferencesOrDefault(User user, UserPreferences? preferences)
        {
            return preferences ?? new UserPreferences
            {
                User = user,
                UserId = user.Id,
                ThousandsSeparator = ",",
                DecimalSeparator = ".",
                DecimalDigits = 2,
                DateFormat = null,
                DateTimeFormat = null,
            };
        }

        public async Task<User> GetById(int id)
        {
            return await _context.Users.SingleAsync(user => user.Id == id);
        }

        public User? GetCurrent(HttpContext context)
        {
            if (MockUser != null)
            {
                return MockUser;
            }
            else
            {
                return (User?)context?.Items["User"];
            }
        }

        private string _generateJwtToken(User user)
        {
            // generate token that is valid for 7 days
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(_jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[] { new Claim("id", user.Id.ToString()) }),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}

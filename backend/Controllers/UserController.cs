using assetgrid_backend.Data;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Services;
using assetgrid_backend.Helpers;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Route("/api/v1/[controller]")]
    public class UserController : Controller
    {
        private IUserService _userService;
        private readonly AssetgridDbContext _context;
        public UserController(AssetgridDbContext context, IUserService userService)
        {
            _context = context;
            _userService = userService;
        }

        [HttpPost("/api/v1/[controller]/[action]")]
        public UserAuthenticatedResponse? Authenticate(AuthenticateModel model)
        {
            if (ModelState.IsValid)
            {
                return _userService.Authenticate(model.Email, model.Password);
            }
            throw new Exception();
        }

        [HttpGet("/api/v1/[controller]")]
        public UserAuthenticatedResponse? GetUser()
        {
            var signedInUser = _userService.GetCurrent(HttpContext);
            if (signedInUser == null)
            {
                return null;
            }

            var user = _context.Users
                .Include(user => user.Preferences)
                .Where(user => user.Id == signedInUser.Id)
                .Select(user => new
                {
                    user,
                    favoriteAccounts = _context.UserAccounts.Include(account => account.Account).Where(account => account.Favorite && account.UserId == user.Id).ToList()
                })
                .SingleOrDefault();

            if (user == null)
            {
                return null;
            }

            var response = new UserAuthenticatedResponse(
                user.user.Id,
                user.user.Email,
                new ViewPreferences(_userService.GetPreferences(user.user)),
                user.favoriteAccounts.Select(account => new ViewAccount(
                    account.Id,
                    account.Account.Name,
                    account.Account.Description,
                    account.Account.AccountNumber,
                    account.Favorite,
                    account.IncludeInNetWorth,
                    ViewAccount.PermissionsFromDbPermissions(account.Permissions),
                    0)
                ).ToList(),
                "");
            return response;
        }

        /// <summary>
        /// Create the first user for this installation
        /// </summary>
        [HttpPost("/api/v1/[controller]/[action]")]
        public void CreateInitial(string email, string password)
        {
            if (! _context.Users.Any())
            {
                _userService.CreateUser(email, password);
            }
            else
            {
                throw new InvalidOperationException("A user already exists");
            }
        }

        /// <summary>
        /// Returns whether any users exist
        /// </summary>
        [HttpGet("/api/v1/[controller]/[action]")]
        public bool Any()
        {
            return _context.Users.Any();
        }

        [HttpPut]
        [Authorize]
        [Route("/api/v1/[controller]/[action]")]
        public ViewPreferences Preferences(ViewPreferences model)
        {
            var user = _userService.GetCurrent(HttpContext)!;

            var preferencesExist = true;
            var preferences = _context.UserPreferences
                .SingleOrDefault(preferences => preferences.UserId == user.Id);
            if (preferences == null)
            {
                preferencesExist = false;
                preferences = new UserPreferences();
                preferences.UserId = user.Id;
            }

            preferences.ThousandsSeparator = model.ThousandsSeparator;
            preferences.DecimalSeparator = model.DecimalSeparator;
            preferences.DecimalDigits = model.DecimalDigits;
            preferences.DateFormat = model.DateFormat;
            preferences.DateTimeFormat = model.DateTimeFormat;
            
            if (!preferencesExist)
            {
                _context.UserPreferences.Add(preferences);
            }
            _context.SaveChanges();

            return new ViewPreferences(preferences);
        }
    }
}

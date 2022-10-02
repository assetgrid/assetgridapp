using assetgrid_backend.Data;
using assetgrid_backend.Models;
using assetgrid_backend.ViewModels;
using assetgrid_backend.Services;
using assetgrid_backend.Helpers;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Route("/api/v1/[controller]")]
    public class UserController : Controller
    {
        private IUserService _user;
        private IAccountService _account;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;
        private readonly AssetgridDbContext _context;
        public UserController(
            AssetgridDbContext context,
            IUserService userService,
            IAccountService accountService,
            IOptions<ApiBehaviorOptions> apiBehaviorOptions)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
            _account = accountService;
        }

        [HttpPost("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(UserAuthenticatedResponse))]
        [ProducesResponseType(StatusCodes.Status400BadRequest, Type = typeof(UserAuthenticatedResponse))]
        public async Task<IActionResult> Authenticate(AuthenticateModel model)
        {
            if (ModelState.IsValid)
            {
                var result = await _user.Authenticate(model.Email, model.Password);
                if (result == null)
                {
                    ModelState.AddModelError(nameof(model.Password), "Invalid username or password");
                    return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
                }
                return Ok(result);
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpGet("/api/v1/[controller]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(UserAuthenticatedResponse))]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        public async Task<IActionResult> GetUser()
        {
            var signedInUser = _user.GetCurrent(HttpContext);
            if (signedInUser == null)
            {
                return Unauthorized();
            }

            var user = await _context.Users
                .Include(user => user.Preferences)
                .Where(user => user.Id == signedInUser.Id)
                .Select(user => new
                {
                    user,
                    favoriteAccounts = _context.UserAccounts.Include(account => account.Account).Where(account => account.Favorite && account.UserId == user.Id).ToList()
                })
                .SingleOrDefaultAsync();

            if (user == null)
            {
                return Unauthorized();
            }

            var response = new UserAuthenticatedResponse(
                user.user.Id,
                user.user.Email,
                new ViewPreferences(_user.GetPreferences(user.user)),
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
            return Ok(response);
        }

        /// <summary>
        /// Create the first user for this installation
        /// </summary>
        [HttpPost("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> CreateInitial(AuthenticateModel model)
        {
            if (! await _context.Users.AnyAsync())
            {
                await _user.CreateUser(model.Email, model.Password);
                return Ok();
            }
            else
            {
                ModelState.AddModelError(nameof(model.Email), "A user already exists");
                return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
            }
        }

        /// <summary>
        /// Returns whether any users exist
        /// </summary>
        [HttpGet("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(bool))]
        public async Task<IActionResult> Any()
        {
            return Ok(await _context.Users.AnyAsync());
        }

        [HttpPut]
        [Authorize]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewPreferences))]
        public async Task<IActionResult> Preferences(ViewPreferences model)
        {
            var user = _user.GetCurrent(HttpContext)!;

            var preferencesExist = true;
            var preferences = await _context.UserPreferences
                .SingleOrDefaultAsync(preferences => preferences.UserId == user.Id);
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
            await _context.SaveChangesAsync();

            return Ok(new ViewPreferences(preferences));
        }

        [HttpPut]
        [Authorize]
        [Route("/api/v1/[controller]/password")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<IActionResult> ChangePassword(UpdatePasswordModel model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var passwordValid =  await _user.ValidatePassword(user, model.OldPassword);

            if (!passwordValid)
            {
                ModelState.AddModelError("OldPassword", "Password is not correct");
            }

            if (ModelState.IsValid)
            {
                _user.SetPassword(user, model.NewPassword);
                await _context.SaveChangesAsync();
                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [Authorize]
        [HttpPost("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> Delete()
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                // Delete preferences
                if (user.Preferences != null)
                {
                    _context.Remove(user.Preferences);
                }

                // Remove all user accounts by this user
                _context.RemoveRange(_context.UserAccounts.Where(x => x.UserId == user.Id));
                await _context.SaveChangesAsync();

                // Delete all accounts where no user has all permissions
                var orphanedAccounts = await _context.Accounts
                    .Where(account => ! _context.UserAccounts.Any(x => x.AccountId == account.Id && x.Permissions == UserAccountPermissions.All))
                    .Select(x => x.Id)
                    .ToListAsync();

                orphanedAccounts.ForEach(id => _account.Delete(id));

                _context.Remove(user);

                await _context.SaveChangesAsync();

                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }
    }
}

using assetgrid_backend.Data;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [EnableCors("AllowAll")]
    public class UserController : Controller
    {
        private readonly HomebudgetContext _context;
        public UserController(HomebudgetContext context)
        {
            _context = context;
        }

        [HttpPut]
        [Route("/[controller]/[action]")]
        public ViewPreferences Preferences(ViewPreferences model)
        {
            var favoriteAccounts = _context.Accounts
                .Where(account => account.Favorite)
                .SelectView()
                .ToList();

            var preferencesExist = true;
            var preferences = _context.UserPreferences
                .SingleOrDefault();
            if (preferences == null)
            {
                preferencesExist = false;
                preferences = new UserPreferences();
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

            return new ViewPreferences
            {
                Id = preferences.Id,
                DecimalDigits = preferences.DecimalDigits,
                DecimalSeparator = preferences.DecimalSeparator,
                ThousandsSeparator = preferences.ThousandsSeparator,
                DateTimeFormat = preferences.DateTimeFormat,
                DateFormat = preferences.DateFormat,
            };
        }

        [HttpGet]
        [Route("/[controller]/[action]")]
        public ViewPreferences Preferences()
        {
            var favoriteAccounts = _context.Accounts
                .Where(account => account.Favorite)
                .SelectView()
                .ToList();

            var preferences = _context.UserPreferences
                .Select(preferences => new ViewPreferences
                {
                    Id = preferences.Id,
                    DecimalDigits = preferences.DecimalDigits,
                    DecimalSeparator = preferences.DecimalSeparator,
                    ThousandsSeparator = preferences.ThousandsSeparator,
                    DateFormat = preferences.DateFormat,
                    DateTimeFormat = preferences.DateTimeFormat,
                })
                .SingleOrDefault() ?? new ViewPreferences
                {
                    Id = 0,
                    DecimalDigits = 2,
                    DecimalSeparator = ".",
                    ThousandsSeparator = ",",
                    DateFormat = null,
                    DateTimeFormat = null,
                };

            preferences.FavoriteAccounts = favoriteAccounts;

            return preferences;
        }
    }
}

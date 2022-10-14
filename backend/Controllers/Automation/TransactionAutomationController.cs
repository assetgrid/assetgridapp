using assetgrid_backend.Data.Search;
using assetgrid_backend.Helpers;
using assetgrid_backend.models.Automation;
using assetgrid_backend.Models;
using assetgrid_backend.Services;
using assetgrid_backend.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace assetgrid_backend.Controllers.Automation
{
    [ApiController]
    [Authorize]
    [Route("/api/v1/Automation/Transaction/[Action]")]
    public class TransactionAutomationController : Controller
    {
        private readonly AssetgridDbContext _context;
        private readonly IUserService _user;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;
        public TransactionAutomationController(AssetgridDbContext context, IUserService userService, IOptions<ApiBehaviorOptions> apiBehaviorOptions)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
        }

        /// <summary>
        /// Runs an automation a single time. Ignores any triggers the automation may have
        /// </summary>
        /// <param name="automation">The automation to run</param>
        [HttpPost()]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> RunSingle(TransactionAutomation automation)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    // Get a list of all accounts the user can write to
                    var writeAccountIds = await _context.UserAccounts
                        .Where(account => account.UserId == user.Id && new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(account.Permissions))
                        .Select(account => account.AccountId)
                        .ToListAsync();

                    var query = _context.Transactions
                        .Include(t => t.SourceAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.SourceAccount!.Identifiers)
                        .Include(t => t.DestinationAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.DestinationAccount!.Identifiers)
                        .Include(t => t.TransactionLines)
                        .Include(t => t.Identifiers)
                        .Where(t => writeAccountIds.Contains(t.SourceAccountId ?? -1) || writeAccountIds.Contains(t.DestinationAccountId ?? -1))
                        .ApplySearch(automation.Query);

                    foreach (var action in automation.Actions)
                    {
                        await action.Run(query, _context);
                    }

                    await _context.SaveChangesAsync();
                    transaction.Commit();
                }

                _context.ChangeTracker.AutoDetectChangesEnabled = true;
                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }
    }
}

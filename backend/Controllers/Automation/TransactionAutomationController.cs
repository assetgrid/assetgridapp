using assetgrid_backend.Data.Search;
using assetgrid_backend.Helpers;
using assetgrid_backend.models.Automation;
using assetgrid_backend.Models;
using assetgrid_backend.Services;
using assetgrid_backend.Models.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using assetgrid_backend.models.ViewModels.Automation;

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
        private readonly IMetaService _meta;

        public TransactionAutomationController(
            AssetgridDbContext context,
            IUserService userService,
            IOptions<ApiBehaviorOptions> apiBehaviorOptions,
            IMetaService meta)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
            _meta = meta;
        }

        /// <summary>
        /// Runs an automation a single time. Ignores any triggers the automation may have
        /// </summary>
        /// <param name="automation">The automation to run</param>
        [HttpPost()]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> RunSingle(ViewTransactionAutomation automation)
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

                    var metaFields = await _meta.GetFields(user.Id);
                    var query = _context.Transactions
                        .Include(t => t.SourceAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.SourceAccount!.Identifiers)
                        .Include(t => t.DestinationAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.DestinationAccount!.Identifiers)
                        .Include(t => t.TransactionLines)
                        .Include(t => t.Identifiers)
                        .Where(t => writeAccountIds.Contains(t.SourceAccountId ?? -1) || writeAccountIds.Contains(t.DestinationAccountId ?? -1))
                        .ApplySearch(automation.Query, metaFields);

                    foreach (var action in automation.Actions)
                    {
                        await action.Run(query, _context, user);
                    }

                    await _context.SaveChangesAsync();
                    transaction.Commit();
                }

                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        /// <summary>
        /// Create a new transaction automation
        /// </summary>
        /// <param name="model">The automation to create</param>
        [HttpPost("/api/v1/Automation/Transaction/")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransactionAutomation))]
        public async Task<IActionResult> Create(ViewTransactionAutomation model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = new TransactionAutomation
                    {
                        Actions = model.Actions,
                        Description = model.Description,
                        Name = model.Name,
                        Query = model.Query,
                        TriggerOnCreate = model.TriggerOnCreate,
                        TriggerOnModify = model.TriggerOnModify
                    };
                    var userTransactionAutomation = new UserTransactionAutomation
                    {
                        Enabled = model.Enabled,
                        Permissions = UserTransactionAutomation.AutomationPermissions.Modify,
                        User = user,
                        UserId = user.Id,
                        TransactionAutomation = result,
                    };
                    _context.TransactionAutomations.Add(result);
                    _context.UserTransactionAutomations.Add(userTransactionAutomation);

                    await _context.SaveChangesAsync();
                    transaction.Commit();

                    return Ok(new ViewTransactionAutomation
                    {
                        Actions = result.Actions,
                        Description = result.Description,
                        Enabled = userTransactionAutomation.Enabled,
                        Id = result.Id,
                        Name = result.Name,
                        Query = result.Query,
                        TriggerOnCreate = result.TriggerOnCreate,
                        TriggerOnModify = result.TriggerOnModify,
                        Permissions = userTransactionAutomation.Permissions
                    });
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        /// <summary>
        /// Get a transaction automation
        /// </summary>
        /// <param name="id">The id of the automation to get</param>
        [HttpGet("/api/v1/Automation/Transaction/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransactionAutomation))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Get(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                var result = await _context.UserTransactionAutomations
                    .Include(x => x.TransactionAutomation)
                    .Where(x => x.UserId == user.Id && x.TransactionAutomationId == id)
                    .SingleOrDefaultAsync();

                if (result == null)
                {
                    return NotFound();
                }

                return Ok(new ViewTransactionAutomation
                {
                    Actions = result.TransactionAutomation.Actions,
                    Description = result.TransactionAutomation.Description,
                    Enabled = result.Enabled,
                    Id = result.TransactionAutomation.Id,
                    Name = result.TransactionAutomation.Name,
                    Query = result.TransactionAutomation.Query,
                    TriggerOnCreate = result.TransactionAutomation.TriggerOnCreate,
                    TriggerOnModify = result.TransactionAutomation.TriggerOnModify,
                    Permissions = result.Permissions
                });
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        /// <summary>
        /// Returns a summary of all transaction automations available for the current user
        /// </summary>
        [HttpGet("/api/v1/Automation/Transaction/")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<ViewTransactionAutomationSummary>))]
        public async Task<IActionResult> List()
        {
            var user = _user.GetCurrent(HttpContext)!;
            var automations = await _context.UserTransactionAutomations
                .Where(x => x.UserId == user.Id)
                .Select(x => new ViewTransactionAutomationSummary
                {
                    Id = x.TransactionAutomationId,
                    Description = x.TransactionAutomation.Description,
                    Enabled = x.Enabled,
                    Name = x.TransactionAutomation.Name,
                    TriggerOnCreate = x.TransactionAutomation.TriggerOnCreate,
                    TriggerOnModify = x.TransactionAutomation.TriggerOnModify,
                    Permissions = x.Permissions
                })
                .ToListAsync();

            return Ok(automations);
        }

        /// <summary>
        /// Modify a transaction automation
        /// </summary>
        /// <param name="id">The id of the automation to modify</param>
        /// <param name="model">The automation to create</param>
        [HttpPut("/api/v1/Automation/Transaction/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransactionAutomation))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Modify(int id, ViewTransactionAutomation model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = await _context.UserTransactionAutomations
                        .Include(x => x.TransactionAutomation)
                        .Where(x => x.UserId == user.Id && x.TransactionAutomationId == id)
                        .SingleOrDefaultAsync();

                    if (result == null)
                    {
                        return NotFound();
                    }

                    if (result.Permissions != UserTransactionAutomation.AutomationPermissions.Modify)
                    {
                        return Forbid();
                    }

                    result.TransactionAutomation.Query = model.Query;
                    result.TransactionAutomation.Actions = model.Actions;
                    result.TransactionAutomation.Description = model.Description;
                    result.TransactionAutomation.Name = model.Name;
                    result.TransactionAutomation.TriggerOnModify = model.TriggerOnModify;
                    result.TransactionAutomation.TriggerOnCreate = model.TriggerOnCreate;
                    result.Enabled = model.Enabled;

                    await _context.SaveChangesAsync();
                    transaction.Commit();

                    return Ok(new ViewTransactionAutomation
                    {
                        Actions = result.TransactionAutomation.Actions,
                        Description = result.TransactionAutomation.Description,
                        Enabled = result.Enabled,
                        Id = result.TransactionAutomationId,
                        Name = result.TransactionAutomation.Name,
                        Query = result.TransactionAutomation.Query,
                        TriggerOnCreate = result.TransactionAutomation.TriggerOnCreate,
                        TriggerOnModify = result.TransactionAutomation.TriggerOnModify,
                        Permissions = result.Permissions
                    });
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        /// <summary>
        /// Delete a transaction automation
        /// </summary>
        /// <param name="id">The id of the automation to delete</param>
        [HttpDelete("/api/v1/Automation/Transaction/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Delete(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var result = await _context.UserTransactionAutomations
                        .Include(x => x.TransactionAutomation)
                        .Where(x => x.UserId == user.Id && x.TransactionAutomationId == id)
                        .SingleOrDefaultAsync();

                    if (result == null)
                    {
                        return NotFound();
                    }

                    if (result.Permissions != UserTransactionAutomation.AutomationPermissions.Modify)
                    {
                        return Forbid();
                    }

                    _context.TransactionAutomations.Remove(result.TransactionAutomation);
                    _context.UserTransactionAutomations.RemoveRange(_context.UserTransactionAutomations.Where(x => x.TransactionAutomationId == result.TransactionAutomationId));

                    await _context.SaveChangesAsync();
                    transaction.Commit();

                    return Ok();
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }
    }
}

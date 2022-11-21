using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Principal;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using System.ComponentModel.DataAnnotations;
using assetgrid_backend.Data.Search;
using assetgrid_backend.models.Search;
using assetgrid_backend.models.ViewModels;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("/api/v1/[controller]")]
    public class TransactionController : ControllerBase
    {
        private readonly AssetgridDbContext _context;
        private readonly IMetaService _meta;
        private readonly IUserService _user;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;
        private readonly IAutomationService _automation;
        private readonly ILogger<TransactionController> _logger;

        public TransactionController(
            AssetgridDbContext context,
            IUserService userService,
            IOptions<ApiBehaviorOptions>
            apiBehaviorOptions,
            IAutomationService automationService,
            IMetaService metaService,
            ILogger<TransactionController> logger)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
            _automation = automationService;
            _meta = metaService;
            _logger = logger;
        }

        [HttpGet()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Get(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var result = await _context.Transactions
                .Where(transaction => _context.UserAccounts.Any(account => account.UserId == user.Id &&
                    (account.AccountId == transaction.SourceAccountId || account.AccountId == transaction.DestinationAccountId)))
                .SelectView(user.Id)
                .SingleOrDefaultAsync(transaction => transaction.Id == id);

            if (result == null) return NotFound();

            result.MetaData = await _meta.GetTransactionMetaValues(id, user.Id);

            return Ok(result);
        }

        [HttpPost()]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Create(ViewModifyTransaction model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                if (model.Identifiers.Count > 0)
                {
                    var identifiers = model.Identifiers.Select(x => x.Trim());
                    var otherTransactionsWithSameIdentifiers = await _context.TransactionUniqueIdentifiers
                        .Where(x => x.Transaction.SourceAccount!.Users!.Any(u => u.UserId == user.Id) || x.Transaction.DestinationAccount!.Users!.Any(u => u.UserId == user.Id))
                        .AnyAsync(x => identifiers.Contains(x.Identifier));
                    if (otherTransactionsWithSameIdentifiers)
                    {
                        ModelState.AddModelError(nameof(model.Identifiers), "Another transaction with this identifier exists");
                        return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory?.Invoke(ControllerContext) ?? BadRequest();
                    }
                }

                using (var transaction = _context.Database.BeginTransaction())
                {
                    // Make sure that the user has permission to create transactions on both accounts referenced by this transaction
                    UserAccountPermissions[] writePermissions = new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions };
                    var userAccountSource = model.SourceId == null ? null : await _context.UserAccounts
                        .Include(account => account.Account.Identifiers)
                        .Where(account => account.UserId == user.Id && account.AccountId == model.SourceId)
                        .SingleOrDefaultAsync();
                    var userAccountDestination = model.DestinationId == null ? null : await _context.UserAccounts
                        .Include(account => account.Account.Identifiers)
                        .Where(account => account.UserId == user.Id && account.AccountId == model.DestinationId)
                        .SingleOrDefaultAsync();
                    if ((model.SourceId != null && (userAccountSource == null || ! writePermissions.Contains(userAccountSource.Permissions))) ||
                        (model.DestinationId != null && (userAccountDestination == null || ! writePermissions.Contains(userAccountDestination.Permissions))))
                    {
                        return Forbid();
                    }


                    var result = new Transaction
                    {
                        DateTime = model.DateTime,
                        SourceAccountId = model.SourceId,
                        Description = model.Description,
                        DestinationAccountId = model.DestinationId,
                        IsSplit = model.IsSplit,
                        Identifiers = null!,
                        Total = model.Total ?? model.Lines.Select(line => line.Amount).Sum(),
                        TransactionLines = null!,
                    };
                    result.Identifiers = model.Identifiers.Select(x => new TransactionUniqueIdentifier(result, x)).ToList();
                    result.TransactionLines = model.Lines.Select((line, i) => new TransactionLine
                    {
                        Amount = line.Amount,
                        Description = line.Description,
                        Category = string.IsNullOrWhiteSpace(line.Category) ? "" : line.Category.Trim(),
                        Order = i + 1,
                        Transaction = result,
                        TransactionId = result.Id
                    }).ToList();

                    // Always store transactions in a format where the total is positive
                    if (result.Total < 0)
                    {
                        result.Total = -result.Total;

                        // Swap accounts
                        var sourceId = result.SourceAccountId;
                        result.SourceAccountId = result.DestinationAccountId;
                        result.DestinationAccountId = sourceId;

                        // Also swap UserAccounts
                        var temp = userAccountDestination;
                        userAccountDestination = userAccountSource;
                        userAccountSource = temp;

                        result.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                    }
                    _context.Transactions.Add(result);
                    await _context.SaveChangesAsync();

                    // Set metadata
                    if (model.MetaData != null)
                    {
                        await _meta.SetTransactionMetaValues(result.Id, user.Id, model.MetaData);
                    }

                    // Get all automations enabled for this user that trigger on create
                    var automations = await _context.UserTransactionAutomations
                        .Include(x => x.TransactionAutomation)
                        .Where(x => x.UserId == user.Id && x.Enabled && x.TransactionAutomation.TriggerOnCreate)
                        .ToListAsync();
                    foreach (var automation in automations)
                    {
                        await _automation.ApplyAutomationToTransaction(result, automation.TransactionAutomation, user);
                    }

                    await _context.SaveChangesAsync();
                    transaction.Commit();

                    var metaData = await _meta.GetTransactionMetaValues(result.Id, user.Id);

                    return Ok(new ViewTransaction {
                        Id = result.Id,
                        Identifiers = result.Identifiers.Select(x => x.Identifier).ToList(),
                        DateTime = result.DateTime,
                        Description = result.Description,
                        Total = result.Total,
                        IsSplit = result.IsSplit,
                        Source = result.SourceAccount != null
                            ? userAccountSource == null ? ViewAccount.GetNoReadAccess(result.SourceAccount.Id) : new ViewAccount(
                                id: result.SourceAccount.Id,
                                name: result.SourceAccount.Name,
                                description: result.SourceAccount.Description,
                                identifiers: result.SourceAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                favorite: userAccountSource!.Favorite,
                                includeInNetWorth: userAccountSource!.IncludeInNetWorth,
                                permissions: ViewAccount.PermissionsFromDbPermissions(userAccountSource!.Permissions),
                                balance: 0
                            ) : null,
                        Destination = result.DestinationAccount != null
                             ? userAccountDestination == null ? ViewAccount.GetNoReadAccess(result.DestinationAccount.Id) : new ViewAccount(
                                id: result.DestinationAccount.Id,
                                name: result.DestinationAccount.Name,
                                description: result.DestinationAccount.Description,
                                identifiers: result.DestinationAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                favorite: userAccountDestination!.Favorite,
                                includeInNetWorth: userAccountDestination!.IncludeInNetWorth,
                                permissions: ViewAccount.PermissionsFromDbPermissions(userAccountDestination!.Permissions),
                                balance: 0
                            ) : null,
                        Lines = result.TransactionLines
                            .OrderBy(line => line.Order)
                            .Select(line => new ViewTransactionLine(amount: line.Amount, description: line.Description, category: line.Category))
                            .ToList(),
                        MetaData = metaData
                    });
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpPut()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, ViewModifyTransaction model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var dbObject = await _context.Transactions
                        .Include(t => t.SourceAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.SourceAccount!.Identifiers)
                        .Include(t => t.DestinationAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.DestinationAccount!.Identifiers)
                        .Include(t => t.TransactionLines)
                        .Include(t => t.Identifiers)
                        .SingleAsync(t => t.Id == id);

                    if (dbObject.SourceAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id) == null && dbObject.DestinationAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id) == null)
                    {
                        // The user has read permissions to neither source nor destination
                        return NotFound();
                    }

                    var writePermissions = new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions };
                    if (dbObject.SourceAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id && writePermissions.Contains(x.Permissions)) == null &&
                        dbObject.DestinationAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id && writePermissions.Contains(x.Permissions)) == null)
                    {
                        // User does not have write permission to this transaction, but they can read it
                        return Forbid();
                    }

                    var sourceUserAccount = dbObject.SourceAccount?.Users!.SingleOrDefault(x => x.UserId == user.Id);
                    if (dbObject.SourceAccountId != model.SourceId)
                    {
                        if (model.SourceId == null)
                        {
                            dbObject.SourceAccount = null;
                        }
                        else
                        {
                            // Make sure that the user has write permissions to the account they are creating the transaction on
                            sourceUserAccount = await _context.UserAccounts
                                .Include(x => x.Account)
                                .Include(x => x.Account.Identifiers)
                                .SingleOrDefaultAsync(x => x.UserId == user.Id && x.AccountId == model.SourceId && writePermissions.Contains(x.Permissions));

                            if (sourceUserAccount == null)
                            {
                                return Forbid();
                            }

                            dbObject.SourceAccountId = model.SourceId;
                            dbObject.SourceAccount = sourceUserAccount.Account;
                        }
                    }
                    var destinationUserAccount = dbObject.DestinationAccount?.Users!.SingleOrDefault(x => x.UserId == user.Id);
                    if (dbObject.DestinationAccountId != model.DestinationId)
                    {
                        if (model.DestinationId == null)
                        {
                            dbObject.DestinationAccountId = null;
                        }
                        else
                        {
                            // Make sure that the user has write permissions to the account they are creating the transaction on
                            destinationUserAccount = await _context.UserAccounts
                                .Include(x => x.Account)
                                .Include(x => x.Account.Identifiers)
                                .SingleOrDefaultAsync(x => x.UserId == user.Id && x.AccountId == model.DestinationId && writePermissions.Contains(x.Permissions));

                            if (destinationUserAccount == null)
                            {
                                return Forbid();
                            }

                            dbObject.DestinationAccountId = model.DestinationId;
                            dbObject.DestinationAccount = destinationUserAccount.Account;
                        }
                    }
                    dbObject.DestinationAccountId = model.DestinationId;
                    dbObject.DateTime = model.DateTime;
                    dbObject.Description = model.Description;
                    dbObject.Identifiers = model.Identifiers.Select(identifier => new TransactionUniqueIdentifier(dbObject, identifier)).ToList();
                    dbObject.IsSplit = model.IsSplit;
                    dbObject.Total = model.Total ?? model.Lines.Select(line => line.Amount).Sum();
                    dbObject.TransactionLines = model.Lines.Select((line, index) => new TransactionLine
                    {
                        Amount = line.Amount,
                        Description = line.Description,
                        Category = string.IsNullOrWhiteSpace(line.Category) ? "" : line.Category.Trim(),
                        Order = index + 1,
                        Transaction = dbObject,
                        TransactionId = dbObject.Id,
                    }).ToList();

                    if (dbObject.Total < 0)
                    {
                        dbObject.Total = -dbObject.Total;
                        dbObject.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                        var source = dbObject.SourceAccount;
                        dbObject.SourceAccountId = dbObject.DestinationAccountId;
                        dbObject.SourceAccount = dbObject.DestinationAccount;
                        dbObject.DestinationAccountId = source?.Id;
                        dbObject.DestinationAccount = source;
                        var temp = sourceUserAccount;
                        sourceUserAccount = destinationUserAccount;
                        destinationUserAccount = temp;
                    }
                    await _context.SaveChangesAsync();

                    // Set metadata
                    if (model.MetaData != null)
                    {
                        await _meta.SetTransactionMetaValues(id, user.Id, model.MetaData);
                    }

                    // Get all automations enabled for this user that trigger on create
                    var automations = await _context.UserTransactionAutomations
                        .Include(x => x.TransactionAutomation)
                        .Where(x => x.UserId == user.Id && x.Enabled && x.TransactionAutomation.TriggerOnModify)
                        .ToListAsync();
                    foreach (var automation in automations)
                    {
                        await _automation.ApplyAutomationToTransaction(dbObject, automation.TransactionAutomation, user);
                    }

                    await _context.SaveChangesAsync();
                    transaction.Commit();

                    var metaData = await _meta.GetTransactionMetaValues(id, user.Id);

                    return Ok(new ViewTransaction
                    {
                        Id = dbObject.Id,
                        Identifiers = dbObject.Identifiers.Select(x => x.Identifier).ToList(),
                        DateTime = dbObject.DateTime,
                        Description = dbObject.Description,
                        Total = dbObject.Total,
                        IsSplit = dbObject.IsSplit,
                        Source = dbObject.SourceAccount != null
                            ? sourceUserAccount == null ? ViewAccount.GetNoReadAccess(dbObject.SourceAccount.Id) : new ViewAccount(
                                id: dbObject.SourceAccount.Id,
                                name: dbObject.SourceAccount.Name,
                                description: dbObject.SourceAccount.Description,
                                identifiers: dbObject.SourceAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                favorite: sourceUserAccount!.Favorite,
                                includeInNetWorth: sourceUserAccount!.IncludeInNetWorth,
                                permissions: ViewAccount.PermissionsFromDbPermissions(sourceUserAccount!.Permissions),
                                balance: 0
                            ) : null,
                        Destination = dbObject.DestinationAccount != null
                             ? destinationUserAccount == null ? ViewAccount.GetNoReadAccess(dbObject.DestinationAccount.Id) : new ViewAccount(
                                id: dbObject.DestinationAccount.Id,
                                name: dbObject.DestinationAccount.Name,
                                description: dbObject.DestinationAccount.Description,
                                identifiers: dbObject.DestinationAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                favorite: destinationUserAccount!.Favorite,
                                includeInNetWorth: destinationUserAccount!.IncludeInNetWorth,
                                permissions: ViewAccount.PermissionsFromDbPermissions(destinationUserAccount!.Permissions),
                                balance: 0
                            ) : null,
                        Lines = dbObject.TransactionLines
                            .OrderBy(line => line.Order)
                            .Select(line => new ViewTransactionLine(amount: line.Amount, description: line.Description, category: line.Category))
                            .ToList(),
                        MetaData = metaData
                    });
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpDelete()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Delete(int id)
        {
            var user = _user.GetCurrent(HttpContext)!;
            using (var transaction = _context.Database.BeginTransaction())
            {
                var dbObject = await _context.Transactions
                    .SingleAsync(t => t.Id == id);

                // Make sure that the user has write permissions to an account this transaction references
                var permissions = await _context.UserAccounts
                    .Where(x => x.UserId == user.Id && (x.AccountId == dbObject.DestinationAccountId || x.AccountId == dbObject.SourceAccountId))
                    .Select(x => x.Permissions)
                    .ToListAsync();
                if (permissions.Count == 0)
                {
                    // User cannot see this transaction
                    return NotFound();
                }
                if (!permissions.Any(permissions => new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(permissions)))
                {
                    // User can see transaction but cannot modify it
                    return Forbid();
                }

                _context.Transactions.Remove(dbObject);
                await _context.SaveChangesAsync();
                transaction.Commit();

                return Ok();
            }
        }

        [HttpDelete()]
        [Route("/api/v1/[controller]/[Action]")]
        public async Task<IActionResult> DeleteMultiple(SearchGroup query)
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
                    var transactions = await _context.Transactions
                        .Include(t => t.TransactionLines)
                        .Where(t => writeAccountIds.Contains(t.SourceAccountId ?? -1) || writeAccountIds.Contains(t.DestinationAccountId ?? -1))
                        .ApplySearch(query, metaFields)
                        .ToListAsync();

                    _context.RemoveRange(transactions.SelectMany(transaction => transaction.TransactionLines));
                    _context.RemoveRange(transactions);
                    await _context.SaveChangesAsync();
                    transaction.Commit();
                }
                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewSearchResponse<ViewTransaction>))]
        public async Task<IActionResult> Search(ViewSearch query)
        {
            var user = _user.GetCurrent(HttpContext)!;
            var metaFields = await _meta.GetFields(user.Id);
            if (ModelState.IsValid)
            {
                var transactionQuery = _context.Transactions.ApplySearch(query, true, metaFields);
                var result = await transactionQuery
                    .Where(transaction => _context.UserAccounts.Any(account => account.UserId == user.Id &&
                        (account.AccountId == transaction.SourceAccountId || account.AccountId == transaction.DestinationAccountId)))
                    .Skip(query.From)
                    .Take(query.To - query.From)
                    .SelectView(user.Id)
                    .ToListAsync();

                return Ok(new ViewSearchResponse<ViewTransaction>
                {
                    Data = result,
                    TotalItems = await transactionQuery.CountAsync(),
                });
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(List<string>))]
        public async Task<IActionResult> FindDuplicates(List<string> identifiers)
        {
            var user = _user.GetCurrent(HttpContext)!;
            return Ok(await _context.TransactionUniqueIdentifiers
                .Where(x => x.Transaction.SourceAccount!.Users!.Any(u => u.UserId == user.Id) || x.Transaction.DestinationAccount!.Users!.Any(u => u.UserId == user.Id))
                .Where(x => identifiers.Contains(x.Identifier))
                .Select(x => x.Identifier!)
                .ToListAsync());
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[action]")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransactionCreateManyResponse))]
        public async Task<IActionResult> CreateMany(List<ViewModifyTransaction> transactions)
        {
            var user = _user.GetCurrent(HttpContext)!;
            _context.ChangeTracker.AutoDetectChangesEnabled = false;

            if (ModelState.IsValid)
            {
                var failed = new List<ViewModifyTransaction>();
                var duplicate = new List<ViewModifyTransaction>();
                var success = new List<Transaction>();

                var writeAccounts = await _context.UserAccounts
                    .Where(account => account.UserId == user.Id && new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(account.Permissions))
                    .Include(account => account.Account)
                    .Include(account => account.Account.Identifiers)
                    .ToDictionaryAsync(x => x.AccountId, x => x);
                var writeAccountIds = writeAccounts.Keys;

                var identifiers = transactions
                    .SelectMany(t => t.Identifiers.Select(identifier => identifier.Trim()))
                    .ToArray();
                var duplicateIdentifiers = (await _context.TransactionUniqueIdentifiers
                    .Where(x => writeAccountIds.Contains(x.Transaction.SourceAccountId ?? -1) || writeAccountIds.Contains(x.Transaction.DestinationAccountId ?? -1))
                    .Where(x => identifiers.Contains(x.Identifier))
                    .Select(x => x.Identifier)
                    .ToListAsync())
                    .ToHashSet();

                // Get all automations that will be run on these transactions
                var automations = await _context.UserTransactionAutomations
                        .Include(x => x.TransactionAutomation)
                        .Where(x => x.UserId == user.Id && x.Enabled && x.TransactionAutomation.TriggerOnCreate)
                        .ToListAsync();

                foreach (var transaction in transactions)
                {
                    if (transaction.Identifiers.Any(x => duplicateIdentifiers.Contains(x.Trim())))
                    {
                        duplicate.Add(transaction);
                    }
                    else
                    {
                        try
                        {
                            if ((transaction.SourceId.HasValue && !writeAccounts.ContainsKey(transaction.SourceId.Value)) ||
                                (transaction.DestinationId.HasValue && !writeAccounts.ContainsKey(transaction.DestinationId.Value)))
                            {
                                throw new Exception("Cannot write to this account");
                            }

                            transaction.Identifiers.ForEach(x => duplicateIdentifiers.Add(x.Trim()));

                            var result = new Transaction
                            {
                                DateTime = transaction.DateTime,
                                SourceAccountId = transaction.SourceId,
                                Description = transaction.Description,
                                DestinationAccountId = transaction.DestinationId,
                                IsSplit = transaction.IsSplit,
                                Identifiers = null!,
                                Total = transaction.Total ?? transaction.Lines.Select(line => line.Amount).Sum(),
                                TransactionLines = null!,
                            };
                            result.Identifiers = transaction.Identifiers.Select(x => new TransactionUniqueIdentifier(result, x)).ToList();
                            result.TransactionLines = transaction.Lines.Select((line, i) => new TransactionLine
                            {
                                Amount = line.Amount,
                                Description = line.Description,
                                Category = string.IsNullOrWhiteSpace(line.Category) ? "" : line.Category.Trim(),
                                Order = i + 1,
                                Transaction = result,
                                TransactionId = result.Id
                            }).ToList();

                            // Always store transactions in a format where the total is positive
                            if (result.Total < 0)
                            {
                                result.Total = -result.Total;
                                var sourceId = result.SourceAccountId;
                                result.SourceAccountId = result.DestinationAccountId;
                                result.DestinationAccountId = sourceId;
                                result.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                            }

                            foreach (var automation in automations)
                            {
                                await _automation.ApplyAutomationToTransaction(result, automation.TransactionAutomation, user);
                            }

                            _context.Transactions.Add(result);
                            success.Add(result);
                        }
                        catch (Exception e)
                        {
                            _logger.LogError(e, e.Message);
                            failed.Add(transaction);
                        }
                    }
                }
                await _context.SaveChangesAsync();
                _context.ChangeTracker.AutoDetectChangesEnabled = true;

                return Ok(new ViewTransactionCreateManyResponse
                {
                    Succeeded = success.Select(result => new ViewTransaction
                    {
                        Id = result.Id,
                        Identifiers = result.Identifiers.Select(x => x.Identifier).ToList(),
                        DateTime = result.DateTime,
                        Description = result.Description,
                        Total = result.Total,
                        IsSplit = result.IsSplit,
                        Source = result.SourceAccount != null
                                    ? !writeAccounts.ContainsKey(result.SourceAccount.Id) ? ViewAccount.GetNoReadAccess(result.SourceAccount.Id) : new ViewAccount(
                                        id: result.SourceAccount.Id,
                                        name: result.SourceAccount.Name,
                                        description: result.SourceAccount.Description,
                                        identifiers: result.SourceAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                        favorite: writeAccounts[result.SourceAccount.Id].Favorite,
                                        includeInNetWorth: writeAccounts[result.SourceAccount.Id].IncludeInNetWorth,
                                        permissions: ViewAccount.PermissionsFromDbPermissions(writeAccounts[result.SourceAccount.Id].Permissions),
                                        balance: 0
                                    ) : null,
                        Destination = result.DestinationAccount != null
                                     ? !writeAccounts.ContainsKey(result.DestinationAccount.Id) ? ViewAccount.GetNoReadAccess(result.DestinationAccount.Id) : new ViewAccount(
                                        id: result.DestinationAccount.Id,
                                        name: result.DestinationAccount.Name,
                                        description: result.DestinationAccount.Description,
                                        identifiers: result.DestinationAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                        favorite: writeAccounts[result.DestinationAccount.Id].Favorite,
                                        includeInNetWorth: writeAccounts[result.DestinationAccount.Id].IncludeInNetWorth,
                                        permissions: ViewAccount.PermissionsFromDbPermissions(writeAccounts[result.DestinationAccount.Id].Permissions),
                                        balance: 0
                                    ) : null,
                        Lines = result.TransactionLines
                            .OrderBy(line => line.Order)
                            .Select(line => new ViewTransactionLine(amount: line.Amount, description: line.Description, category: line.Category))
                            .ToList(),
                    }).ToList(),
                    Failed = failed,
                    Duplicate = duplicate,
                });
            }

            _context.ChangeTracker.AutoDetectChangesEnabled = true;
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }
    }
}
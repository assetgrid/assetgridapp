using assetgrid_backend.Data;
using assetgrid_backend.Helpers;
using assetgrid_backend.Models;
using assetgrid_backend.ViewModels;
using assetgrid_backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Principal;

namespace assetgrid_backend.Controllers
{
    [ApiController]
    [Authorize]
    [Route("/api/v1/[controller]")]
    public class TransactionController : ControllerBase
    {
        private readonly AssetgridDbContext _context;
        private readonly IUserService _user;
        private readonly IOptions<ApiBehaviorOptions> _apiBehaviorOptions;

        public TransactionController(AssetgridDbContext context, IUserService userService, IOptions<ApiBehaviorOptions> apiBehaviorOptions)
        {
            _context = context;
            _user = userService;
            _apiBehaviorOptions = apiBehaviorOptions;
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

            return Ok(result);
        }

        [HttpPost()]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        public async Task<IActionResult> Create(ViewCreateTransaction model)
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
                        return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
                    }
                }

                using (var transaction = _context.Database.BeginTransaction())
                {
                    // Make sure that the user has permission to create transactions on both accounts referenced by this transaction
                    UserAccountPermissions[] writePermissions = new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions };
                    var userAccountSource = model.SourceId == null ? null : await _context.UserAccounts
                        .Where(account => account.UserId == user.Id && account.AccountId == model.SourceId)
                        .SingleOrDefaultAsync();
                    var userAccountDestination = model.DestinationId == null ? null : await _context.UserAccounts
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
                        Identifiers = model.Identifiers.Select(x => new TransactionUniqueIdentifier
                        {
                            Identifier = x
                        }).ToList(),
                        Total = model.Total ?? model.Lines.Select(line => line.Amount).Sum(),
                        Category = string.IsNullOrWhiteSpace(model.Category) ? "" : model.Category,
                        TransactionLines = model.Lines.Select((line, i) => new TransactionLine
                        {
                            Amount = line.Amount,
                            Description = line.Description,
                            Order = i + 1,
                        }).ToList(),
                    };

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
                    transaction.Commit();
                    await _context.SaveChangesAsync();
                    return Ok(new ViewTransaction {
                        Id = result.Id,
                        Identifiers = result.Identifiers.Select(x => x.Identifier).ToList(),
                        DateTime = result.DateTime,
                        Description = result.Description,
                        Category = result.Category,
                        Total = result.Total,
                        Source = result.SourceAccount != null
                            ? userAccountSource == null ? ViewAccount.GetNoReadAccess(result.SourceAccount.Id) : new ViewAccount(
                                id: result.SourceAccount.Id,
                                name: result.SourceAccount.Name,
                                description: result.SourceAccount.Description,
                                accountNumber: result.SourceAccount.AccountNumber,
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
                                accountNumber: result.DestinationAccount.AccountNumber,
                                favorite: userAccountDestination!.Favorite,
                                includeInNetWorth: userAccountDestination!.IncludeInNetWorth,
                                permissions: ViewAccount.PermissionsFromDbPermissions(userAccountDestination!.Permissions),
                                balance: 0
                            ) : null,
                        Lines = result.TransactionLines
                            .OrderBy(line => line.Order)
                            .Select(line => new ViewTransactionLine(amount: line.Amount, description: line.Description))
                            .ToList(),
                    });
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        #region Update transactions

        [HttpPut()]
        [Route("/api/v1/[controller]/{id}")]
        [ProducesResponseType(StatusCodes.Status200OK, Type = typeof(ViewTransaction))]
        [ProducesResponseType(StatusCodes.Status403Forbidden)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<IActionResult> Update(int id, ViewUpdateTransaction model)
        {
            var user = _user.GetCurrent(HttpContext)!;
            if (ModelState.IsValid)
            {
                using (var transaction = _context.Database.BeginTransaction())
                {
                    var dbObject = await _context.Transactions
                        .Include(t => t.SourceAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.DestinationAccount!.Users!.Where(u => u.UserId == user.Id))
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

                    var result = await UpdateTransaction(dbObject, user, model);
                    await _context.SaveChangesAsync();
                    transaction.Commit();
                    return result;
                }
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        [HttpPost()]
        [Route("/api/v1/[controller]/[Action]")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        public async Task<IActionResult> UpdateMultiple(ViewUpdateMultipleTransactions request)
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
                        .Include(t => t.DestinationAccount!.Users!.Where(u => u.UserId == user.Id))
                        .Include(t => t.TransactionLines)
                        .Include(t => t.Identifiers)
                        .Where(t => writeAccountIds.Contains(t.SourceAccountId ?? -1) || writeAccountIds.Contains(t.DestinationAccountId ?? -1))
                        .ApplySearch(request.query);

                    var transactions = await query.ToListAsync();
                    foreach (var dbObject in transactions)
                    {
                        // We ignore any errors returned
                        await UpdateTransaction(dbObject, user, request.model);
                    }

                    await _context.SaveChangesAsync();
                    transaction.Commit();
                }
                return Ok();
            }
            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }

        private async Task<IActionResult> UpdateTransaction(Transaction dbObject, User user, ViewUpdateTransaction model)
        {
            // Update accounts
            var writePermissions = new[] { UserAccountPermissions.ModifyTransactions, UserAccountPermissions.All };
            if (model.SourceId != null && dbObject.SourceAccountId != model.SourceId)
            {
                if (model.SourceId == -1)
                {
                    dbObject.SourceAccountId = null;
                    dbObject.SourceAccount = null;
                }
                else
                {
                    var newSourceUserAccount = await _context.UserAccounts
                        .Include(x => x.Account)
                        .SingleOrDefaultAsync(x => x.UserId == user.Id && x.AccountId == model.SourceId && writePermissions.Contains(x.Permissions));
                    if (newSourceUserAccount == null)
                    {
                        return Forbid();
                    }
                    dbObject.SourceAccountId = newSourceUserAccount.Id;
                    dbObject.SourceAccount = newSourceUserAccount.Account;
                }
            }
            if (model.DestinationId != null && dbObject.DestinationAccountId != model.DestinationId)
            {
                if (model.DestinationId == -1)
                {
                    dbObject.DestinationAccountId = null;
                    dbObject.DestinationAccount = null;
                }
                else
                {
                    var newDestinationUserAccount = await _context.UserAccounts
                        .Include(x => x.Account)
                        .SingleOrDefaultAsync(x => x.UserId == user.Id && x.AccountId == model.DestinationId && writePermissions.Contains(x.Permissions));
                    if (newDestinationUserAccount == null)
                    {
                        return Forbid();
                    }
                    dbObject.DestinationAccountId = newDestinationUserAccount.Id;
                    dbObject.DestinationAccount = newDestinationUserAccount.Account;
                }
            }

            // Update remaining properties
            if (model.DateTime != null)
            {
                dbObject.DateTime = model.DateTime.Value;
            }
            if (model.Description != null)
            {
                dbObject.Description = model.Description;
            }
            if (model.Identifiers != null)
            {
                _context.RemoveRange(dbObject.Identifiers);
                dbObject.Identifiers = model.Identifiers.Select(x => new TransactionUniqueIdentifier
                {
                    TransactionId = dbObject.Id,
                    Identifier = x.Trim()
                }).ToList();

            }
            if (model.Category != null)
            {
                dbObject.Category = model.Category;
            }
            if (model.Total != null && dbObject.TransactionLines.Count == 0)
            {
                dbObject.Total = model.Total.Value;
                if (dbObject.Total < 0)
                {
                    // All transactions must have positive totals
                    dbObject.Total = -dbObject.Total;
                    var source = dbObject.SourceAccountId;
                    dbObject.SourceAccountId = dbObject.DestinationAccountId;
                    dbObject.DestinationAccountId = source;
                }
            }
            if (model.Lines != null)
            {
                if (model.Total != null)
                {
                    dbObject.Total = model.Total.Value;
                }

                _context.RemoveRange(dbObject.TransactionLines);
                dbObject.TransactionLines = model.Lines.Select((line, index) =>
                    new TransactionLine
                    {
                        Amount = line.Amount,
                        Description = line.Description,
                        Order = index,
                        Transaction = dbObject,
                        TransactionId = dbObject.Id,
                    })
                    .ToList();

                if (dbObject.Total < 0)
                {
                    // All transactions must have positive totals
                    dbObject.Total = -dbObject.Total;
                    var source = dbObject.SourceAccountId;
                    dbObject.SourceAccountId = dbObject.DestinationAccountId;
                    dbObject.DestinationAccountId = source;
                    dbObject.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                }
            }

            if (dbObject.SourceAccountId == null && dbObject.DestinationAccountId == null)
            {
                ModelState.AddModelError(nameof(dbObject.SourceAccountId), "Either source or destination id must be set.");
                ModelState.AddModelError(nameof(dbObject.DestinationAccountId), "Either source or destination id must be set.");
                return _apiBehaviorOptions.Value.InvalidModelStateResponseFactory(ControllerContext);
            }
            if (dbObject.SourceAccountId == dbObject.DestinationAccountId)
            {
                ModelState.AddModelError(nameof(dbObject.SourceAccountId), "Source and destination must be different.");
                ModelState.AddModelError(nameof(dbObject.DestinationAccountId), "Source and destination must be different.");
                return _apiBehaviorOptions.Value.InvalidModelStateResponseFactory(ControllerContext);
            }

            await _context.SaveChangesAsync();

            var sourceUserAccount = dbObject.SourceAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id);
            var destinationUserAccount = dbObject.DestinationAccount?.Users?.SingleOrDefault(x => x.UserId == user.Id);

            return Ok(new ViewTransaction
            {
                Id = dbObject.Id,
                Identifiers = dbObject.Identifiers.Select(x => x.Identifier).ToList(),
                DateTime = dbObject.DateTime,
                Description = dbObject.Description,
                Category = dbObject.Category,
                Total = dbObject.Total,
                Source = dbObject.SourceAccount != null
                    ? sourceUserAccount == null ? ViewAccount.GetNoReadAccess(dbObject.SourceAccount.Id) : new ViewAccount(
                        id: dbObject.SourceAccount.Id,
                        name: dbObject.SourceAccount.Name,
                        description: dbObject.SourceAccount.Description,
                        accountNumber: dbObject.SourceAccount.AccountNumber,
                        favorite: sourceUserAccount.Favorite,
                        includeInNetWorth: sourceUserAccount.IncludeInNetWorth,
                        permissions: ViewAccount.PermissionsFromDbPermissions(sourceUserAccount.Permissions),
                        balance: 0
                    ) : null,
                Destination = dbObject.DestinationAccount != null
                    ? destinationUserAccount == null ? ViewAccount.GetNoReadAccess(dbObject.DestinationAccount.Id) : new ViewAccount(
                        id: dbObject.DestinationAccount.Id,
                        name: dbObject.DestinationAccount.Name,
                        description: dbObject.DestinationAccount.Description,
                        accountNumber: dbObject.DestinationAccount.AccountNumber,
                        favorite: destinationUserAccount.Favorite,
                        includeInNetWorth: destinationUserAccount.IncludeInNetWorth,
                        permissions: ViewAccount.PermissionsFromDbPermissions(destinationUserAccount.Permissions),
                        balance: 0
                    ) : null,
                Lines = dbObject.TransactionLines
                    .OrderBy(line => line.Order)
                    .Select(line => new ViewTransactionLine(amount: line.Amount, description: line.Description))
                    .ToList(),
            });
        }

        #endregion

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
        public async Task<IActionResult> DeleteMultiple(ViewSearchGroup query)
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

                    var transactions = await _context.Transactions
                        .Include(t => t.TransactionLines)
                        .Where(t => writeAccountIds.Contains(t.SourceAccountId ?? -1) || writeAccountIds.Contains(t.DestinationAccountId ?? -1))
                        .ApplySearch(query)
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
            if (ModelState.IsValid)
            {
                var result = await _context.Transactions
                    .Where(transaction => _context.UserAccounts.Any(account => account.UserId == user.Id &&
                        (account.AccountId == transaction.SourceAccountId || account.AccountId == transaction.DestinationAccountId)))
                    .ApplySearch(query, true)
                    .Skip(query.From)
                    .Take(query.To - query.From)
                    .SelectView(user.Id)
                    .ToListAsync();

                return Ok(new ViewSearchResponse<ViewTransaction>
                {
                    Data = result,
                    TotalItems = await _context.Transactions.ApplySearch(query, false).CountAsync(),
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
        public async Task<IActionResult> CreateMany(List<ViewCreateTransaction> transactions)
        {
            var user = _user.GetCurrent(HttpContext)!;

            if (ModelState.IsValid)
            {
                var failed = new List<ViewCreateTransaction>();
                var duplicate = new List<ViewCreateTransaction>();
                var success = new List<ViewCreateTransaction>();

                var writeAccountIds = await _context.UserAccounts
                    .Where(account => account.UserId == user.Id && new[] { UserAccountPermissions.All, UserAccountPermissions.ModifyTransactions }.Contains(account.Permissions))
                    .Select(account => account.AccountId)
                    .ToListAsync();

                var identifiers = transactions
                    .SelectMany(t => t.Identifiers.Select(identifier => identifier.Trim()))
                    .ToArray();
                var duplicateIdentifiers = (await _context.TransactionUniqueIdentifiers
                    .Where(x => writeAccountIds.Contains(x.Transaction.SourceAccountId ?? -1) || writeAccountIds.Contains(x.Transaction.DestinationAccountId ?? -1))
                    .Where(x => identifiers.Contains(x.Identifier))
                    .Select(x => x.Identifier)
                    .ToListAsync())
                    .ToHashSet();

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
                            if ((transaction.SourceId.HasValue && ! writeAccountIds.Contains(transaction.SourceId.Value)) ||
                                (transaction.DestinationId.HasValue && !writeAccountIds.Contains(transaction.DestinationId.Value)))
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
                                Identifiers = transaction.Identifiers.Select(x => new TransactionUniqueIdentifier
                                {
                                    Identifier = x.Trim()
                                }).ToList(),
                                Total = transaction.Total ?? transaction.Lines.Select(line => line.Amount).Sum(),
                                Category = transaction.Category,
                                TransactionLines = transaction.Lines.Select((line, i) => new Models.TransactionLine
                                {
                                    Amount = line.Amount,
                                    Description = line.Description,
                                    Order = i + 1,
                                }).ToList(),
                            };

                            // Always store transactions in a format where the total is positive
                            if (result.Total < 0)
                            {
                                result.Total = -result.Total;
                                var sourceId = result.SourceAccountId;
                                result.SourceAccountId = result.DestinationAccountId;
                                result.DestinationAccountId = sourceId;
                                result.TransactionLines.ForEach(line => line.Amount = -line.Amount);
                            }

                            _context.Transactions.Add(result);
                            await _context.SaveChangesAsync();
                            success.Add(transaction);
                        }
                        catch (Exception)
                        {
                            failed.Add(transaction);
                        }
                    }
                }

                return Ok(new ViewTransactionCreateManyResponse
                {
                    Succeeded = success,
                    Failed = failed,
                    Duplicate = duplicate,
                });
            }

            return _apiBehaviorOptions.Value?.InvalidModelStateResponseFactory(ControllerContext) ?? BadRequest();
        }
    }
}
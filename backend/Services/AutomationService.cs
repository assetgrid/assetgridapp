using assetgrid_backend.Data.Search;
using assetgrid_backend.models.Automation;
using assetgrid_backend.models.MetaFields;
using assetgrid_backend.models.ViewModels;
using assetgrid_backend.models.ViewModels.Automation;
using assetgrid_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace assetgrid_backend.Services
{
    public interface IAutomationService
    {
        Task<bool> ApplyAutomationToTransaction(
            Transaction transaction,
            TransactionAutomation automation,
            User user,
            Dictionary<int, MetaField>? metaFields = null);
        Task RunAutomation(ViewTransactionAutomation automation, User user);
    }

    public class AutomationService : IAutomationService
    {
        private readonly AssetgridDbContext _context;
        private readonly IMetaService _meta;

        public AutomationService(AssetgridDbContext context, IMetaService meta)
        {
            _context = context;
            _meta = meta;
        }

        public async Task<bool> ApplyAutomationToTransaction(
            Transaction transaction,
            TransactionAutomation automation,
            User user,
            Dictionary<int, MetaField>? metaFields = null)
        {
            if (metaFields == null)
            {
                metaFields = await _meta.GetFields(user.Id);
            }
            var transactionQuery = new List<Transaction> { transaction }.AsQueryable();
            if (transactionQuery.ApplySearch(automation.Query, metaFields).Count() == 1)
            {
                foreach (var action in automation.Actions)
                {
                    await RunAction(action, transaction, user);
                }
                return true;
            }
            return false;
        }

        public async Task RunAutomation(ViewTransactionAutomation automation, User user)
        {
            using (var dbTransaction = _context.Database.BeginTransaction())
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

                foreach (var transaction in await query.ToListAsync())
                {
                    foreach (var action in automation.Actions)
                    {
                        await RunAction(action, transaction, user);
                    }
                }

                await _context.SaveChangesAsync();
                dbTransaction.Commit();
            }
        }

        private async Task RunAction(TransactionAutomationAction action, Transaction transaction, User user)
        {
            switch (action)
            {
                // Set timestamp
                case ActionSetTimestamp a:
                    transaction.DateTime = a.Value;
                    break;
                // Set description
                case ActionSetDescription a:
                    transaction.Description = a.Value;
                    break;
                case ActionSetAmount a:
                    if (transaction.IsSplit == false)
                    {
                        if (a.Value >= 0)
                        {
                            transaction.Total = a.Value;
                            transaction.TransactionLines.Single().Amount = a.Value;
                        }
                        else
                        {
                            transaction.Total = -a.Value;
                            transaction.TransactionLines.Single().Amount = -a.Value;
                            var sourceId = transaction.SourceAccountId;
                            transaction.SourceAccountId = transaction.DestinationAccountId;
                            transaction.DestinationAccountId = sourceId;
                        }
                    }
                    break;
                case ActionSetAccount a:
                    // Verify that the user has write permissions to the account
                    if (a.Value != null)
                    {
                        var writePermissions = new[] { UserAccountPermissions.ModifyTransactions, UserAccountPermissions.All };
                        var canWrite = _context.UserAccounts
                            .Any(x => x.UserId == user.Id && x.AccountId == a.Value && writePermissions.Contains(x.Permissions));

                        if (!canWrite)
                        {
                            throw new Exception("User does not have permission to write to this account");
                        }
                    }

                    if ((a.Account == "source" && transaction.DestinationAccountId == a.Value) ||
                        (a.Account == "destination" && transaction.SourceAccountId == a.Value))
                    {
                        // Do nothing as it would result in a transaction with the same account twice or no source or destination
                        return;
                    }

                    switch (a.Account)
                    {
                        case "source":
                            transaction.SourceAccountId = a.Value;
                            break;
                        case "destination":
                            transaction.DestinationAccountId = a.Value;
                            break;
                        default:
                            throw new Exception($"Unknown account '{a.Account}'");
                    }
                    break;
                case ActionSetCategory a:
                    transaction.TransactionLines.ForEach(line => line.Category = a.Value);
                    break;
                case ActionSetLines a:
                    if (a.Value.Count == 0)
                    {
                        // Turn transactions into non-split transactions
                        transaction.IsSplit = false;
                        transaction.TransactionLines = new List<TransactionLine> { transaction.TransactionLines.First() };
                        transaction.TransactionLines.First().Amount = transaction.Total;
                    }
                    else
                    {
                        var lines = a.Value.Select((line, i) => new TransactionLine
                        {
                            Order = i + 1,
                            Amount = line.Amount,
                            Category = line.Category,
                            Description = line.Description,
                            Transaction = transaction,
                        }).ToList();
                        var total = lines.Select(line => line.Amount).Sum();
                        var swapSourceDestination = false;
                        if (total < 0)
                        {
                            swapSourceDestination = true;
                            total = -total;
                            lines.ForEach(line => line.Amount = -line.Amount);
                        }

                        if (swapSourceDestination)
                        {
                            var sourceId = transaction.SourceAccountId;
                            transaction.SourceAccountId = transaction.DestinationAccountId;
                            transaction.DestinationAccountId = sourceId;
                        }
                        transaction.TransactionLines = lines;
                        transaction.Total = total;
                        transaction.IsSplit = true;
                    }
                    break;
                case ActionDelete a:
                    _context.Transactions.Remove(transaction);
                    break;
                case ActionSetMetaValue a:
                    await _meta.SetTransactionMetaValues(transaction.Id, user.Id, new List<ViewSetMetaField>
                    {
                        new ViewSetMetaField {
                            MetaId = a.FieldId,
                            Value = a.Value,
                        }
                    });
                    break;
            }
        }
    }
}

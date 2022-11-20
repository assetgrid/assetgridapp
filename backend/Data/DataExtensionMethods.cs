using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Models;
using System.Linq.Expressions;
using System.Text.Json;
using assetgrid_backend.models.Search;
using assetgrid_backend.Data.Search;

namespace assetgrid_backend.Data
{
    public static class DataExtensionMethods
    {
        #region Transaction
        public static IQueryable<ViewTransaction> SelectView(this IQueryable<Transaction> query, int userId)
        {
            return query.Select(transaction => new ViewTransaction
            {
                Id = transaction.Id,
                DateTime = transaction.DateTime,
                Description = transaction.Description,
                IsSplit = transaction.IsSplit,
                Source = transaction.SourceAccount == null ? null
                        : !transaction.SourceAccount.Users!.Any(user => user.UserId == userId) ? ViewAccount.GetNoReadAccess(transaction.SourceAccount.Id)
                            : new ViewAccount(
                                transaction.SourceAccount.Id,
                                transaction.SourceAccount.Name,
                                transaction.SourceAccount.Description,
                                // We don't include identifiers on transactions because it is unnecessary and because it fails during testing with MemoryDb
                                new List<string>(),
                                // transaction.SourceAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                transaction.SourceAccount.Users!.Single(user => user.UserId == userId).Favorite,
                                transaction.SourceAccount.Users!.Single(user => user.UserId == userId).IncludeInNetWorth,
                                ViewAccount.PermissionsFromDbPermissions(transaction.SourceAccount.Users!.Single(user => user.UserId == userId).Permissions),
                                0),
                Destination = transaction.DestinationAccount == null ? null
                        : !transaction.DestinationAccount.Users!.Any(user => user.UserId == userId) ? ViewAccount.GetNoReadAccess(transaction.DestinationAccount.Id)
                            : new ViewAccount(
                                transaction.DestinationAccount.Id,
                                transaction.DestinationAccount.Name,
                                transaction.DestinationAccount.Description,
                                // We don't include identifiers on transactions because it is unnecessary and because it fails during testing with MemoryDb
                                new List<string>(),
                                // transaction.DestinationAccount.Identifiers!.Select(x => x.Identifier).ToList(),
                                transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).Favorite,
                                transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).IncludeInNetWorth,
                                ViewAccount.PermissionsFromDbPermissions(transaction.DestinationAccount.Users!.Single(user => user.UserId == userId).Permissions),
                                0),
                Identifiers = transaction.Identifiers.Select(x => x.Identifier).ToList(),
                Lines = transaction.TransactionLines
                    .OrderBy(line => line.Order)
                    .Select(line => new ViewTransactionLine(line.Amount, line.Description, line.Category))
                    .ToList(),
                Total = transaction.TransactionLines.Select(line => line.Amount).Sum()
            });
        }

        #endregion

        #region Account
        public static IQueryable<ViewAccount> SelectView(this IQueryable<UserAccount> query)
        {
            return query.Select(account => new ViewAccount(
                account.AccountId,
                account.Account.Name,
                account.Account.Description,
                account.Account.Identifiers!.Select(x => x.Identifier).ToList(),
                account.Favorite,
                account.IncludeInNetWorth,
                (ViewAccount.AccountPermissions)(account.Permissions + 1),
                0
            ));
        }

        #endregion
    }
}

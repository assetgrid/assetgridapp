using homebudget_server.Data;
using homebudget_server.Models;
using homebudget_server.Models.ViewModels;
using Microsoft.AspNetCore.Cors;
using Microsoft.AspNetCore.Mvc;

namespace homebudget_server.Controllers
{
    [ApiController]
    [EnableCors("AllowAll")]
    [Route("[controller]")]
    public class AccountController : Controller
    {
        private readonly ILogger<TransactionController> _logger;
        private readonly HomebudgetContext _context;

        public AccountController(ILogger<TransactionController> logger, HomebudgetContext context)
        {
            _logger = logger;
            _context = context;
        }

        [HttpPost()]
        public ViewAccount Create(ViewCreateAccount model)
        {
            if (ModelState.IsValid)
            {
                var result = new Models.Account
                {
                    Name = model.Name,
                    Description = model.Description,
                    AccountNumber = model.AccountNumber
                };
                _context.Accounts.Add(result);
                _context.SaveChanges();
                return new ViewAccount
                {
                    Id = result.Id,
                    AccountNumber = result.AccountNumber,
                    Description = result.Description,
                    Name = result.Name
                };
            }
            throw new Exception();
        }

        [HttpGet()]
        [Route("/[controller]/{id}")]
        public ViewAccount? Get(int id)
        {
            var result = _context.Accounts
                .SelectView()
                .SingleOrDefault(account => account.Id == id);

            return result;
        }

        [HttpPut()]
        [Route("/[controller]/{id}")]
        public ViewAccount? Update(int id, ViewAccount model)
        {
            var result = _context.Accounts
                .SingleOrDefault(account => account.Id == id);

            if (result == null)
            {
                throw new Exception($"Account not found with id {id}");
            }

            result.AccountNumber = model.AccountNumber;
            result.Description = model.Description;
            result.Name = model.Name;
            result.Favorite = model.Favorite;

            _context.SaveChanges();

            return new ViewAccount
            {
                Id = result.Id,
                Name = result.Name,
                Description = result.Description,
                AccountNumber = result.AccountNumber,
                Favorite = result.Favorite,
            };
        }

        [HttpPost()]
        [Route("/[controller]/[action]")]
        public ViewSearchResponse<ViewAccount> Search(ViewSearch query)
        {
            var result = _context.Accounts
                .ApplySearch(query)
                .Skip(query.From)
                .Take(query.To - query.From)
                .SelectView()
                .ToList();

            return new ViewSearchResponse<ViewAccount>
            {
                Data = result,
                TotalItems = _context.Accounts.ApplySearch(query).Count()
            };
        }

        [HttpPost()]
        [Route("/[controller]/{id}/[action]")]
        public ViewTransactionList Transactions(int id, ViewTransactionListRequest request)
        {
            var query = _context.Transactions
                .Where(transaction => transaction.SourceAccountId == id || transaction.DestinationAccountId == id);

            if (request.Descending)
            {
                query = query.OrderByDescending(transaction => transaction.DateTime)
                    .ThenByDescending(transaction => transaction.Id);
            }
            else
            {
                query = query.OrderBy(transaction => transaction.DateTime)
                    .ThenBy(transaction => transaction.Id);
            }

            var result = query
                .Skip(request.From)
                .Take(request.To - request.From)
                .SelectView()
                .ToList();
            var firstTransaction = result
                .OrderBy(transaction => transaction.DateTime)
                .ThenBy(transaction => transaction.Id).FirstOrDefault();
            var total = firstTransaction == null ? 0 : query
                .Where(transaction => transaction.DateTime <= firstTransaction.DateTime && transaction.Id < firstTransaction.Id)
                .Select(transaction => transaction.Total * (transaction.DestinationAccountId == id ? 1 : -1))
                .Sum();

            return new ViewTransactionList
            {
                Data = result,
                TotalItems = query.Count(),
                Total = total,
            };
        }
    }
}

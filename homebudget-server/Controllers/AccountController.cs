using homebudget_server.Data;
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
        public ViewAccount Create(CreateViewAccount model)
        {
            if (ModelState.IsValid)
            {
                var result = new Models.Account
                {
                    Name = model.Name,
                    Description = model.Description
                };
                _context.Accounts.Add(result);
                _context.SaveChanges();
                return result.ToView();
            }
            throw new Exception();
        }

        [HttpPost()]
        [Route("/[controller]/[action]")]
        public List<ViewAccount> Search(ViewSearch query)
        {
            return _context.Accounts
                .ApplySearch(query)
                .ToList()
                .Select(account => account.ToView())
                .ToList();
        }
    }
}

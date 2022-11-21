using assetgrid_backend.Controllers;
using assetgrid_backend.Models.ViewModels;
using assetgrid_backend.Models;
using assetgrid_backend.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using assetgrid_backend;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using assetgrid_backend.Controllers.Automation;

namespace backend.unittests
{
    public class TestBase
    {
        public AssetgridDbContext Context { get; set; }

        // Controllers
        public AccountController AccountController { get; set; }
        public UserController UserController { get; set; }
        public TransactionController TransactionController { get; set; }
        public TransactionAutomationController AutomationController { get; set; }
        public TaxonomyController TaxonomyController { get; set; }

        // Services
        public UserService UserService { get; set; }
        public AccountService AccountService { get; set; }
        public AutomationService AutomationService { get; set; }
        public MetaService MetaService { get; set; }
        public AttachmentService AttachmentService { get; set; }

        // Test objects
        public User UserA { get; set; }
        public User UserB { get; set; }

        public TestBase()
        {
            // Create DB context and connect
            var connection = new MySqlConnector.MySqlConnection("DataSource=:memory:");
            var options = new DbContextOptionsBuilder<AssetgridDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning));
            Context = new AssetgridDbContext(options.Options);

            // Setup services
            UserService = new UserService(JwtSecret.Get(), Context);
            AccountService = new AccountService(Context);
            IConfiguration configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?> { { "UploadDirectory", "./Content" } })
                .Build();
            AttachmentService = new AttachmentService(configuration, Context);
            MetaService = new MetaService(Context, AttachmentService);
            AutomationService = new AutomationService(Context, MetaService);

            // Create users
            UserController = new UserController(Context, UserService, AccountService, Options.Create<ApiBehaviorOptions>(null!));
            UserController.CreateInitial(new AuthenticateModel { Email = "userA", Password = "test" }).Wait();
            var userAResonse = UserController.Authenticate(new AuthenticateModel { Email = "userA", Password = "test" }).Result.OkValue<UserAuthenticatedResponse>();
            UserA = UserService.GetById(userAResonse.Id).Result;
            UserService.MockUser = UserA;
            UserB = UserService.CreateUser("userB", "test").Result;

            // Setup controllers controller
            AccountController = new AccountController(Context, UserService, AccountService, Options.Create(new ApiBehaviorOptions()), MetaService);
            TransactionController = new TransactionController(Context, UserService, Options.Create(new ApiBehaviorOptions()), AutomationService, MetaService, Mock.Of<ILogger<TransactionController>>());
            var objectValidator = new Mock<IObjectModelValidator>();
            objectValidator.Setup(o => o.Validate(It.IsAny<ActionContext>(),
                                            It.IsAny<ValidationStateDictionary>(),
                                            It.IsAny<string>(),
                                            It.IsAny<Object>()));
            TransactionController.ObjectValidator = objectValidator.Object;
            AutomationController = new TransactionAutomationController(Context, UserService, Options.Create<ApiBehaviorOptions>(null!), MetaService);
            TaxonomyController = new TaxonomyController(Context, UserService);
        }
    }
}

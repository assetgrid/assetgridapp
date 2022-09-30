using Microsoft.AspNetCore.Mvc;

namespace backend.unittests
{
    public static class TestHelpers
    {
        public static T OkValue<T>(this IActionResult result)
        {
            var castedResult = (OkObjectResult)result;
            if (castedResult.StatusCode != 200)
            {
                throw new System.Exception("Ok results must be returned withs status code 200");
            }
            return (T)castedResult.Value!;
        }
    }
}
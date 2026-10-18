namespace AgentReview.DotnetDemo;

public partial class ReviewPolicy : IReviewPolicy
{
    public int RecommendedThreshold => 90;

    public string? Evaluate(string? label, int score)
    {
        if (score < 90) return "reject";
        return label switch
        {
            "trusted" => "accept",
            _ => "review"
        };
    }

    public string? Evaluate(int score) => Evaluate("trusted", score);
}

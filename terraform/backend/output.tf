output "state-bucket" {
  value = aws_s3_bucket.state.bucket
}


output "lock-table" {

    value = aws_dynamodb_table.lock.arn
}


